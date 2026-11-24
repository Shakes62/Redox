"""Write .srt captions for the film from the narration timings in src/films/<film>/vo.json.

Upload them with the videos where the platform allows (YouTube, Facebook, LinkedIn, X), so the films
read well with the sound off. TikTok and Instagram make their own captions: switch them on there.

    python scripts/captions.py   # -> out/redoxdesignx-how-to-order.en.srt (same timing for 9:16 and 16:9)
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILMS = {'redox': 'out/redoxdesignx-how-to-order.en.srt'}
FPS = 30
MAX_CHARS = 74  # two lines of ~37 characters
LINE = 40


def stamp(frames):
    ms = int(round(frames / FPS * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'


def two_lines(text):
    if len(text) <= LINE:
        return text
    words, best = text.split(), None
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        score = max(len(a), len(b))
        if best is None or score < best[0]:
            best = (score, a, b)
    return f'{best[1]}\n{best[2]}'


def build(film, out_path):
    vo = json.loads((ROOT / 'src/films' / film / 'vo.json').read_text(encoding='utf-8'))
    out = ROOT / out_path
    cues = []
    for seg in vo['segments']:
        words = seg['text'].split()
        timing = seg['words']
        assert len(words) == len(timing), (seg['scene'], len(words), len(timing))
        group = []
        for word, t in zip(words, timing):
            if group and len(' '.join(w for w, _ in group + [(word, t)])) > MAX_CHARS:
                cues.append(group)
                group = []
            group.append((word, t))
            if re.search(r'[.?!]$', word):  # one sentence per caption where possible
                cues.append(group)
                group = []
        if group:
            cues.append(group)

    lines = []
    for i, group in enumerate(cues):
        start = group[0][1]['f']
        end = group[-1][1]['e'] + 8
        if i + 1 < len(cues):
            end = min(end, cues[i + 1][0][1]['f'] - 1)
        text = two_lines(' '.join(w for w, _ in group))
        lines.append(f'{i + 1}\n{stamp(start)} --> {stamp(end)}\n{text}\n')

    out.parent.mkdir(exist_ok=True)
    out.write_text('\n'.join(lines), encoding='utf-8')
    print(f'wrote {out.relative_to(ROOT)} ({len(cues)} captions)')


for film, path in FILMS.items():
    build(film, path)
