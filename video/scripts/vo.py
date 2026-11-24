"""REDOXDESIGNX voiceover (free Microsoft neural voice via edge-tts) + the film's timing.

The same recipe as the Plugg and Gistspot films (QUALITY_PLAYBOOK.md section 5), for one film:
  redox    the range (weights, GSM, every product), then how to order, step by step

Audio first. Every scene gets ONE paragraph, spoken in one take, so the delivery flows
instead of stopping and starting line by line. Then, for every paragraph, the script:

  1. checks every word in the script was actually spoken (nothing skipped or swallowed),
  2. measures where the sound really starts and ends in the waveform (not TTS metadata),
     so no word is ever clipped at either end,
  3. places it in the film with the same short, natural pause between paragraphs,
  4. sets each scene's length so the picture is on screen exactly while its words are said.

Outputs
  public/audio/redox/voiceover.wav   one continuous narration track, loudness-normalised
  src/films/redox/vo.json            where each paragraph and word lands (the film syncs to it)
  src/films/redox/timing.json        scene order + lengths, rewritten to fit the voice
  public/audio/redox/music.mp3       music bed cut to the film's new length (from audio-src/)

    python scripts/vo.py                # build the film's audio
    python scripts/vo.py --samples      # hear a few voices read the opening (.cache/vo/samples)
"""
import asyncio
import hashlib
import json
import math
import re
import subprocess
import sys
import wave
from array import array
from collections import deque
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
BASE_TIMING = ROOT / 'src/timing.json'
MUSIC_SRC = ROOT / 'audio-src/mixkit-158-happy-times.mp3'

TIMING = json.loads(BASE_TIMING.read_text(encoding='utf-8'))
FPS, SPEED, TRANS = TIMING['fps'], TIMING['speed'], TIMING['transition']
SR = 48000

# Andrew (Multilingual): warm, confident, clear. Try --samples to compare others.
VOICE = {'voice': 'en-US-AndrewMultilingualNeural', 'rate': '+6%', 'pitch': '+0Hz'}

VO_LUFS = -16.0  # narration level before the final master (-14 LUFS for the whole film)
MUSIC_LUFS = -18.0
MAX_TP = -1.5

GAP = 12  # frames of quiet between paragraphs (0.4 s, the same as a sentence pause in one take)
AFTER = 3  # the slide to the next scene starts this many frames after a paragraph's last sound
END_HOLD = 54  # the final frame stays up this long after the last word
PRE, POST = 0.08, 0.18  # seconds kept before the first / after the last sound (pure room tone)
QUIET_DB = -48.0  # below this (RMS, 10 ms windows) counts as silence

# (scene, lead, min, text)
#   lead = design frames into the scene before the voice may start
#   min  = shortest the scene may be (design frames) so its animation can finish
# Scenes play in this order; the film reads its order from src/films/redox/timing.json, which this writes.
# Every claim matches the live store: the catalogue (src/catalog.json, from `npm run photos`), the
# product page and checkout (src/components/product, src/components/cart in the app), the SMS texts
# (src/lib/sms.ts, src/lib/shipping-sms.ts) and the delivery places and their note in Admin > Delivery.
# Numbers are written as digits where the caption should show digits ("230 GSM").
FILMS = {
    'redox': [
        ('intro', 8, 200, "Meet Redox Design. Heavy cotton tees, raglans and caps, in every colour, delivered across Ghana."),
        ('weights', 6, 200, "Pick your weight, from 230 GSM for every day, to 320 GSM heavyweight. Higher number, thicker cotton."),
        ('range', 6, 230, "Plain tees, two tone raglans, long sleeves, the summer patch tee, and tracker caps in 19 colours."),
        ('quality', 6, 220, "Every shirt is one hundred percent cotton, boxy and true to size. Buy ten or more of most pieces for the wholesale price. And we print your designs too."),
        ('howto', 10, 150, "Ordering takes a minute. Here's exactly how."),
        ('colour', 6, 180, "Open any piece. Step one, tap a colour, and the photo shows it."),
        ('size', 6, 230, "Step two, tap your sizes. Mix sizes and colours, and your total updates. Then tap buy now."),
        ('details', 6, 220, "Checkout is three quick steps. Your name, your phone number for SMS updates, and your email for the receipt."),
        ('delivery', 6, 240, "Then pick your town, from over one hundred and sixty places across Ghana. The delivery price shows right away."),
        ('pay', 6, 260, "Review, and tap pay. Paystack opens securely. Choose mobile money, card or bank, and approve with your PIN."),
        ('placed', 6, 220, "Done. Your order number shows on screen, and an SMS confirms every item, your total and a tracking link."),
        ('ship', 6, 280, "We start packing right away. When it ships, you get another SMS, and our team calls to deliver, today or tomorrow. Track it any time with your order number."),
        ('trust', 6, 200, "Secure payment, an SMS at every step, and real people on WhatsApp whenever you need us."),
        ('end', 10, 190, "Redox Design. Wear it plain. Print it loud. Shop now on our website."),
    ],
}


def paths(film):
    return {
        'cache': ROOT / '.cache/vo' / film,
        'track': ROOT / 'public/audio' / film / 'voiceover.wav',
        'manifest': ROOT / 'src/films' / film / 'vo.json',
        'timing': ROOT / 'src/films' / film / 'timing.json',
        'music': ROOT / 'public/audio' / film / 'music.mp3',
        'src': f'audio/{film}/voiceover.wav',
    }


def real(design_frames):
    """Same rounding as realFrames() in src/timeline.ts (JS Math.round)."""
    return math.floor(design_frames / SPEED + 0.5)


def design_for(real_frames):
    d = round(real_frames * SPEED)
    while real(d) < real_frames:
        d += 1
    while real(d) > real_frames:
        d -= 1
    return d


def ffmpeg(*args):
    cmd = ['npx', 'remotion', 'ffmpeg', '-hide_banner', '-y', *[str(a) for a in args]]
    p = subprocess.run(cmd, cwd=ROOT, shell=(sys.platform == 'win32'), capture_output=True, text=True, encoding='utf-8', errors='replace')
    if p.returncode != 0:
        raise RuntimeError(p.stderr[-1500:])
    return p


def loudness(path, *pre):
    """Integrated loudness + true peak (EBU R128) of a file."""
    p = ffmpeg(*pre, '-i', path, '-vn', '-af', 'loudnorm=print_format=json', '-f', 'null', '-')
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr)
    s = json.loads(m.group(0))
    return float(s['input_i']), float(s['input_tp'])


def read_wav(path):
    with wave.open(str(path), 'rb') as w:
        assert w.getnchannels() == 1 and w.getsampwidth() == 2 and w.getframerate() == SR, path
        a = array('h')
        a.frombytes(w.readframes(w.getnframes()))
    if sys.byteorder == 'big':
        a.byteswap()
    return a


def write_wav(path, a):
    b = array('h', a)
    if sys.byteorder == 'big':
        b.byteswap()
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b.tobytes())


WIN = SR // 100  # 10 ms


def envelope(a):
    out = []
    for i in range(0, len(a) - WIN + 1, WIN):
        s = 0
        for x in a[i : i + WIN]:
            s += x * x
        r = math.sqrt(s / WIN) / 32768
        out.append(20 * math.log10(r) if r > 0 else -120.0)
    return out


def sound_bounds(env):
    """First/last moment with sound (seconds) and every quiet stretch in between."""
    on = [i for i, d in enumerate(env) if d > QUIET_DB]
    if not on:
        raise RuntimeError('clip is silent')
    pauses, run = [], 0
    for i in range(on[0], on[-1] + 1):
        if env[i] <= QUIET_DB:
            run += 1
        else:
            if run >= 15:
                pauses.append(run / 100)
            run = 0
    return on[0] / 100, (on[-1] + 1) / 100, pauses


def tokens(text):
    return [t.lower().replace('’', "'") for t in re.findall(r"[A-Za-z0-9'’]+", text)]


async def synth(text, path, voice=VOICE, tries=8):
    """One paragraph -> mp3 + word timings. The free service throttles rapid requests, so space them out."""
    for k in range(tries):
        await asyncio.sleep(2.5 if k == 0 else 3 + k * 3)
        try:
            com = edge_tts.Communicate(text, voice['voice'], rate=voice['rate'], pitch=voice['pitch'], boundary='WordBoundary')
            words = []
            with open(path, 'wb') as f:
                async for ch in com.stream():
                    if ch['type'] == 'audio':
                        f.write(ch['data'])
                    elif ch['type'] == 'WordBoundary':
                        words.append((ch['text'], ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7))
            if words:
                return words
            raise RuntimeError('no word timings returned')
        except Exception as e:  # throttled or a network hiccup: wait and try again
            if k == tries - 1:
                raise
            print(f'  retrying ({type(e).__name__})')


async def make_clip(cache, scene, text):
    mp3, wav, meta = cache / f'{scene}.mp3', cache / f'{scene}.wav', cache / f'{scene}.json'
    key = hashlib.sha1(json.dumps([VOICE, text]).encode()).hexdigest()
    cached = json.loads(meta.read_text(encoding='utf-8')) if meta.exists() else {}
    if cached.get('key') == key and mp3.exists():
        words = [tuple(w) for w in cached['words']]  # same text + voice as last time: reuse the take
    else:
        part = cache / f'{scene}.part.mp3'
        words = await synth(text, part)
        part.replace(mp3)
        meta.write_text(json.dumps({'key': key, 'words': words}), encoding='utf-8')
    ffmpeg('-i', mp3, '-ac', 1, '-ar', SR, '-c:a', 'pcm_s16le', wav)
    a = read_wav(wav)
    s0, s1, pauses = sound_bounds(envelope(a))

    said = tokens(' '.join(w for w, _, _ in words))
    want = tokens(text)
    if said != want:
        raise RuntimeError(f'{scene}: the voice did not say the script exactly.\n  script: {want}\n  spoken: {said}')
    if words[-1][2] > s1 + 0.12:
        raise RuntimeError(f'{scene}: audio stops {words[-1][2] - s1:.2f}s before the last word ends')
    return {'samples': a, 's0': s0, 's1': s1, 'pauses': pauses, 'words': words}


def place(clips):
    """Put each paragraph on the timeline and size every scene around its voice."""
    T = real(TRANS)
    start, prev_end, rows = 0, None, []
    for i, c in enumerate(clips):
        last = i == len(clips) - 1
        cue = start + real(c['lead'])
        P = cue if prev_end is None else max(cue, prev_end + GAP)
        E = P + (c['s1'] - c['s0']) * FPS
        need = math.ceil(E - start + (END_HOLD if last else T + AFTER))
        D = max(real(c['min']), need)
        rows.append({**c, 'start': start, 'P': P, 'E': E, 'D': D, 'quiet_before': P - (prev_end if prev_end is not None else 0)})
        prev_end = E
        start += D - T
    return rows, start + T


def assemble(rows, total):
    track = array('h', bytes(2 * total * (SR // FPS)))
    fade = int(0.006 * SR)
    for r in rows:
        a = r['samples']
        pre = min(PRE, r['s0'])
        i0 = int(round((r['s0'] - pre) * SR))
        i1 = min(len(a), int(round((r['s1'] + POST) * SR)))
        piece = a[i0:i1]
        for k in range(min(fade, len(piece) // 2)):  # 6 ms edges, inside room tone, so no clicks
            g = k / fade
            piece[k] = int(piece[k] * g)
            piece[-1 - k] = int(piece[-1 - k] * g)
        dst = int(round((r['P'] / FPS - pre) * SR))
        n = min(len(piece), len(track) - dst)
        track[dst : dst + n] = piece[:n]
    return track


def limit(x, gain_db, ceiling_db=-2.0, look=0.0025, release=0.08):
    """Gain, then a transparent look-ahead peak limiter (offline, so zero latency).

    Only the sharpest consonant peaks are touched; the gain dips in a smooth ramp just
    before each one and recovers over `release`, so speech keeps its natural shape while
    the narration can sit at broadcast loudness without clipping.
    """
    n = len(x)
    g = 10 ** (gain_db / 20)
    c = 10 ** (ceiling_db / 20) * 32767
    L = max(1, int(look * SR))
    req = array('d', [1.0]) * n
    for i in range(n):
        v = abs(x[i]) * g
        if v > c:
            req[i] = c / v
    m = array('d', [1.0]) * n  # min over the last L samples
    dq = deque()
    for i in range(n):
        r = req[i]
        while dq and req[dq[-1]] >= r:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - L:
            dq.popleft()
        m[i] = req[dq[0]]
    a = 1 - math.exp(-1 / (release * SR))
    acc = sum(m[0:L]) + max(0, L - n)
    env, y = 1.0, array('h', bytes(2 * n))
    for i in range(n):
        s = acc / L  # average of the next L minima: reaches each peak's requirement exactly on time
        acc += (m[i + L] if i + L < n else 1.0) - m[i]
        env = min(s, env + (1 - env) * a)
        v = int(round(x[i] * g * env))
        y[i] = 32767 if v > 32767 else -32768 if v < -32768 else v
    return y


def fit_music(total, out):
    if not MUSIC_SRC.exists():
        print(f'music: {MUSIC_SRC.name} not found, keeping {out.name} as it is')
        return
    dur = total / FPS + 0.5
    li, tp = loudness(MUSIC_SRC, '-t', f'{dur:.3f}')
    gain = min(MUSIC_LUFS - li, MAX_TP - tp)
    ffmpeg('-t', f'{dur:.3f}', '-i', MUSIC_SRC, '-af', f'volume={gain:.2f}dB', '-ar', SR, '-c:a', 'libmp3lame', '-q:a', 2, out)
    print(f'music: {dur:.1f}s cut from {MUSIC_SRC.name}, {li:.1f} -> {li + gain:.1f} LUFS')


async def build(film):
    script = FILMS[film]
    p = paths(film)
    p['cache'].mkdir(parents=True, exist_ok=True)
    p['track'].parent.mkdir(parents=True, exist_ok=True)
    p['manifest'].parent.mkdir(parents=True, exist_ok=True)
    print(f'\n=== {film} ===')

    clips = []
    for scene, lead, mn, text in script:
        c = await make_clip(p['cache'], scene, text)
        c.update(scene=scene, lead=lead, min=mn, text=text)
        clips.append(c)
        n = len(tokens(text))
        print(f'{scene:<10} {c["s1"] - c["s0"]:5.2f}s  {n:>2} words  {n / (c["s1"] - c["s0"]) * 60:4.0f} wpm  all words spoken')

    rows, total = place(clips)

    # one continuous narration track: one gain for all of it (keeps the take's natural dynamics)
    # plus a gentle peak limiter so it reaches -16 LUFS with clean headroom
    raw = p['cache'] / 'voiceover-raw.wav'
    vo = assemble(rows, total)
    write_wav(raw, vo)
    li, _ = loudness(raw)
    gain = VO_LUFS - li
    for _ in range(3):
        write_wav(p['track'], limit(vo, gain))
        lo, to = loudness(p['track'])
        if abs(lo - VO_LUFS) < 0.1:
            break
        gain += VO_LUFS - lo
    li, gain = lo - gain, gain  # report as raw loudness + applied gain
    if to > -1.0:
        print(f'WARNING: narration true peak {to:.1f} dBTP')

    T = real(TRANS)
    dur = {}
    segs = []
    print()
    print(f"{'scene':<10} {'start':>6} {'length':>7}  voice          quiet before")
    for r in rows:
        dur[r['scene']] = design_for(r['D'])
        words = [
            {'w': tokens(w)[0] if tokens(w) else w.lower(), 'f': round(r['P'] + (a - r['s0']) * FPS, 2), 'e': round(r['P'] + (b - r['s0']) * FPS, 2)}
            for w, a, b in r['words']
        ]
        segs.append({'scene': r['scene'], 'text': r['text'], 'from': round(r['P'], 2), 'to': round(r['E'], 2), 'words': words})
        long_pause = max(r['pauses'], default=0)
        print(
            f"{r['scene']:<10} {r['start'] / FPS:5.2f}s {r['D'] / FPS:6.2f}s  {r['P'] / FPS:5.2f}-{r['E'] / FPS:5.2f}s  {r['quiet_before'] / FPS:4.2f}s"
            + (f'   (longest pause inside: {long_pause:.2f}s)' if long_pause > 0.5 else '')
        )

    timing = {**TIMING, 'order': [r['scene'] for r in rows], 'dur': dur}
    timing['_note'] = f'Written by scripts/vo.py for the "{film}" film. Scene lengths are DESIGN frames; fps, speed and transition come from src/timing.json.'
    p['timing'].write_text(json.dumps(timing, indent=2) + '\n', encoding='utf-8')
    p['manifest'].write_text(json.dumps({'src': p['src'], 'frames': total, 'segments': segs}, indent=1) + '\n', encoding='utf-8')

    check = sum(real(dur[k]) for k in timing['order']) - T * (len(rows) - 1)
    assert check == total, (check, total)
    print(f'\nfilm: {total} frames ({total / FPS:.1f}s); narration {li + gain:.1f} LUFS')
    print(f"wrote {p['track'].relative_to(ROOT)}, {p['manifest'].relative_to(ROOT)}, {p['timing'].relative_to(ROOT)}")
    fit_music(total, p['music'])


async def samples():
    out = ROOT / '.cache/vo/samples'
    out.mkdir(parents=True, exist_ok=True)
    line = FILMS['redox'][0][3]
    for v in ['en-US-AndrewMultilingualNeural', 'en-US-BrianMultilingualNeural', 'en-US-AvaMultilingualNeural', 'en-US-EmmaMultilingualNeural']:
        await synth(line, out / f'{v}.mp3', {'voice': v, 'rate': VOICE['rate'], 'pitch': '+0Hz'})
        print('sample', out / f'{v}.mp3')


async def main(args):
    if '--samples' in args:
        await samples()
        return
    films = [a for a in args if not a.startswith('-')] or list(FILMS)
    for film in films:
        if film not in FILMS:
            raise SystemExit(f'unknown film "{film}". Choose from: {", ".join(FILMS)}')
        await build(film)


if __name__ == '__main__':
    asyncio.run(main(sys.argv[1:]))
