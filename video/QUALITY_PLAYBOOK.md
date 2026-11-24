# Motion film quality playbook (complete)

Everything used to make the Gistspot pitch film, and how to make another film with **the same voice, the same
sound, the same smooth motion and the same UI quality**. The guide covers every tool and version, every audio
file, every setting, every step in order, and the full source of every file to reuse (Appendix A).

---

## 0. What "the same quality" means, in numbers

Measured from the delivered file `out/gistspot-pitch-9x16.mp4`:

| | Measured |
|---|---|
| Length | 58.6 s (1,757 frames), 11 scenes |
| Video | 1080×1920 (a 1920×1080 version is rendered too), 30 fps, H.264, yuv420p, bt709 colour, about 1.85 Mbps |
| Audio | AAC, 48 kHz, stereo, 320 kbps |
| Loudness | **−14.1 LUFS** integrated, **−1.0 dBTP** true peak, loudness range 2.6 LU |
| File size | 16 MB |

Measured inside the project, before mixing:

| Layer | Measured |
|---|---|
| Narration `public/audio/vo/voiceover.wav` | 48 kHz, mono, 16-bit, 58.57 s, **−16.1 LUFS**, true peak −1.8 dBTP |
| Music `public/audio/music.mp3` | 48 kHz, stereo, 59.1 s, **−18.0 LUFS**, true peak −7.5 dBTP |
| Speaking pace | **186 words per minute** on average (126 to 240 per scene) |

If the new film hits these numbers, it will sound and feel the same.

---

## 1. Everything that was used

### 1.1 Software (exact versions)

| Tool | Version | What it does |
|---|---|---|
| Node.js | 24.21.0 | Runs Remotion |
| npm | 11.19.0 | Installs the packages |
| Python | 3.14.7 | Runs the voice, mastering and caption scripts |
| edge-tts (Python) | **7.3.1** | Gets the narration from Microsoft's neural voices |
| Remotion | **4.0.541** | Turns React components into video frames, then into MP4 |
| ffmpeg | n7.1, **bundled inside Remotion** | All audio conversion, measuring and mastering, run as `npx remotion ffmpeg` / `npx remotion ffprobe`, so nothing else needs installing and every machine uses the same build |
| Chrome Headless Shell | downloaded by Remotion | Remotion draws each frame in a headless browser. It downloads automatically on the first render, or ahead of time with `npx remotion browser ensure` |

Python packages that come with edge-tts: aiohttp 3.14.5, certifi, tabulate 0.10.0, typing_extensions 4.16.0.
The scripts otherwise use only Python's standard library (`wave`, `array`, `asyncio`, `hashlib`, `json`, `subprocess`).
**No numpy, no pydub, no separate ffmpeg install.**

### 1.2 npm packages (`package.json`, all pinned exactly)

| Package | Version | Used for |
|---|---|---|
| `remotion` | 4.0.541 | `Composition`, `AbsoluteFill`, `Sequence`, `Audio`, `Img`, `staticFile`, `interpolate`, `spring`, `Easing`, `random`, `useCurrentFrame`, `useVideoConfig`, `registerRoot` |
| `@remotion/cli` | 4.0.541 | `remotion studio`, `remotion render`, `remotion still`, bundled ffmpeg/ffprobe. It also brings `@remotion/bundler` and `@remotion/renderer`, which `scripts/stills.mjs` uses |
| `@remotion/transitions` | 4.0.541 | `TransitionSeries`, `slide()`, `linearTiming()` |
| `@remotion/google-fonts` | 4.0.541 | Loads Bricolage Grotesque, Instrument Sans, DM Mono so frames never render in a fallback font |
| `@remotion/fonts` | 4.0.541 | Installed for loading local font files (`public/fonts/`, Inter). Not used by the film right now |
| `react`, `react-dom` | 18.3.1 | |
| `typescript` | 5.6.3 | `npm run typecheck` |
| `@types/react` | 18.3.12 | |

All `@remotion/*` packages **must be exactly the same version** as `remotion`. Copy `package-lock.json` too, so
`npm install` gives the identical tree. Remotion's API changes between versions. For example, `<Audio trimBefore>`
was called `startFrom` in older versions.

### 1.3 The voice

| Setting | Value |
|---|---|
| Service | Microsoft Edge online neural TTS, through `edge-tts` |
| Voice | **`en-US-AndrewMultilingualNeural`** (Andrew: warm, confident, clear, international English) |
| Rate | **`+6%`** (slightly brisk) |
| Pitch | **`+0Hz`** |
| Timing data | `boundary='WordBoundary'`, which gives the start and end of every word. Needed for the word check and for `cue()` |
| What the service sends | MP3, 24 kHz, mono, 48 kbps |
| What the project stores | WAV, **48 kHz, mono, 16-bit PCM** (converted with ffmpeg: `-ac 1 -ar 48000 -c:a pcm_s16le`) |
| Other voices tried | `en-US-BrianMultilingualNeural`, `en-US-AvaMultilingualNeural`, `en-US-EmmaMultilingualNeural` (`python scripts/vo.py --samples`) |

**For the same voice, use exactly these three values: voice, rate and pitch.** Neural TTS is not identical on every request, so each take differs a
tiny bit, but the voice, tone and pace stay the same.

### 1.4 Music

| | |
|---|---|
| Track | **"Happy Times" by Alejandro Magaña (A. M.)**, Mixkit track id 158 |
| Source | `https://assets.mixkit.co/music/158/158.mp3` (from mixkit.co/free-stock-music) |
| Licence | Mixkit Stock Music Free License: free for commercial projects, no attribution required |
| Original file | `audio-src/mixkit-158-happy-times.mp3`: 100.1 s, 44.1 kHz stereo, 256 kbps, 3.2 MB |
| Why this track | Its energy never drops, so there are no build-ups or breakdowns fighting the voice |
| Film version | `public/audio/music.mp3`, written by `vo.py`: cut from the start to *film length + 0.5 s*, levelled to −18 LUFS, MP3 VBR `-q:a 2`, 48 kHz |

### 1.5 Sound effects (all Mixkit, Mixkit Sound Effects Free License)

| File | Mixkit sound | Format | Length |
|---|---|---|---|
| `public/audio/sfx/type.mp3` | "Fast laptop keyboard typing" (id 1392) | MP3 44.1 kHz stereo | 5.04 s |
| `public/audio/sfx/whoosh.mp3` | "Fast small sweep transition" (id 166) | MP3 44.1 kHz stereo | 0.81 s |
| `public/audio/sfx/tap.mp3` | "Cool interface click tone" (id 2568) | MP3 44.1 kHz stereo | 0.24 s |
| `public/audio/sfx/pop.mp3` | "Message pop alert" (id 2354) | MP3 44.1 kHz stereo | 1.10 s |

The film uses these Mixkit MP3s. `scripts/sfx.py` is an older backup that synthesises simple `.wav` effects in
code. It is **not** what you hear in the film. (The comment next to `sfx` in `src/script.ts` still says `.wav`;
the film loads `.mp3`.)

### 1.6 Checksums: proof you have the exact same audio files

```
5d8153579cfbd4ec23738494dff8dec95b3737981578222b793eff9e3fdd4ca8  public/audio/sfx/whoosh.mp3
1b41ec99c2791eb1d292e0f1b09355a3cf0c184db42458d34cd041e249951e4b  public/audio/sfx/tap.mp3
58ecb2df40864551fd8aa7f770c13646187854df7fe4ca74497997b24f7669cd  public/audio/sfx/pop.mp3
1b98731c8e5e93442af22494713b428e75c163b3130690249f54d1684d4a04af  public/audio/sfx/type.mp3
2b5bb1c0e47e765c77c97dbbbed420d3639f1643230cfc4aea3f26a116489bff  audio-src/mixkit-158-happy-times.mp3
```

Check with `sha256sum <file>` (Git Bash) or `Get-FileHash <file>` (PowerShell). **Copy these files from the
Gistspot repo** rather than downloading them again, so you are sure to get the same sound.

### 1.7 Fonts and images

| | |
|---|---|
| Headlines and card titles | **Bricolage Grotesque** (variable font; weight 800 for headlines, 700 for cards; optical size `opsz` 96 for headlines, 14 for cards) |
| Body text | **Instrument Sans** 400 / 500 / 600 |
| Labels | **DM Mono** 400 / 500, uppercase, letter-spaced |
| Loaded with | `@remotion/google-fonts` (needs internet while rendering) |
| Images | The real app icon `public/app-icon.png`, wordmark SVGs. Everything else (phones, app screens, icons, store marks) is drawn in code |

---

## 2. Set up a new film project from zero

```bash
# 1. Install Node.js 24 LTS (nodejs.org) and Python 3.14 (python.org). Tick "Add to PATH" on Windows.
# 2. Python package for the voice
pip install edge-tts==7.3.1

# 3. Project folder (inside the other project, e.g. its own video/ folder)
mkdir video && cd video
#    put package.json, package-lock.json, remotion.config.ts, tsconfig.json from Appendix A here
npm install
npx remotion browser ensure      # downloads the headless browser used to render frames

# 4. Folders
mkdir -p scripts src/components src/scenes public/audio/sfx public/audio/vo audio-src
```

`.gitignore`:
```
node_modules/
out/
.cache/
```

### On the same computer: copy the kit straight from the Gistspot repo (Git Bash)

```bash
SRC="/c/Users/SHABS LAB/Documents/WebApps/Whisper/video"
DEST="<path to the other project>/video"

mkdir -p "$DEST"/{scripts,src/components,src/scenes,public/audio/sfx,public/audio/vo,audio-src}
cp "$SRC"/{package.json,package-lock.json,remotion.config.ts,tsconfig.json,.gitignore,CREDITS.md,QUALITY_PLAYBOOK.md} "$DEST"/
cp "$SRC"/scripts/{vo.py,master.py,captions.py,stills.mjs} "$DEST"/scripts/
cp "$SRC"/src/{index.ts,Root.tsx,Film.tsx,script.ts,brand.ts,timing.json} "$DEST"/src/
cp "$SRC"/src/components/{anim.ts,Type.tsx} "$DEST"/src/components/
cp "$SRC"/public/audio/sfx/*.mp3 "$DEST"/public/audio/sfx/
cp "$SRC"/audio-src/mixkit-158-happy-times.mp3 "$DEST"/audio-src/
cd "$DEST" && npm install
```

Then follow section 3 to adapt it to the new product.

### Files: keep as they are, or rewrite

| File | Action |
|---|---|
| `scripts/vo.py` | **Keep.** Change only `SCRIPT` (your scenes and lines). Change `MUSIC_SRC` only if you use different music |
| `scripts/master.py`, `scripts/captions.py`, `scripts/stills.mjs` | **Keep.** In `captions.py`, change the output file name |
| `remotion.config.ts`, `tsconfig.json`, `package.json` | **Keep.** In `package.json`, change the output file names in the render scripts |
| `src/index.ts`, `src/Root.tsx` | **Keep.** Rename the composition ids if you like |
| `src/components/anim.ts` | **Keep** (`useT`, `ease`, `useSpringAt`, `useLayout`) |
| `src/components/Type.tsx` | **Keep** (headline word reveal, labels, body text). It uses the font names from `brand.ts` |
| `src/Film.tsx` | **Keep the audio half exactly** (music ducking, narration, SFX player). Rewrite `SCENES` and `SFX_CUES` for your scenes |
| `src/script.ts` | **Keep the helpers** (`realFrames`, `startOf`, `at`, `cue`, `TOTAL`, `AUDIO`). Replace the Gistspot words and posts with yours |
| `src/brand.ts` | **Keep** `EASE`, `EASE_INOUT`, the springs and the font loading. Replace the colours with the new brand's tokens |
| `src/timing.json` | **Keep** `fps: 30`, `speed: 1.3`, `transition: 15`. `vo.py` rewrites `order` and `dur` |
| `Phone.tsx`, `Kit.tsx`, `Icons.tsx`, `Mark.tsx`, scenes | **Rewrite** for the new product, following sections 9–10 |

---

## 3. The workflow, step by step

```bash
npm run voice        # 1. narration + timing  (python scripts/vo.py)
npm run studio       # 2. build and preview the scenes (localhost timeline)
node scripts/stills.mjs Pitch-Vertical out/v 0 300 900   # 3. PNG frames for quick review
npm run render       # 4. 9:16 MP4, then mastered automatically
npm run render:wide  # 5. 16:9 MP4, then mastered automatically
npm run captions     # 6. .srt captions from the word timings
npm run render:all   #    4 + 5 + 6 in one go
```

**Order matters:**

1. Write the story (section 4) and the narration lines (in `SCRIPT` in `vo.py`).
2. Run `npm run voice`. It voices each scene, checks it, stitches the narration, levels it, sets every scene's
   length to fit its words, records every word's frame, and cuts the music to the new length.
3. Build the scenes. Tie the key moments to words with `cue()` (section 8.4).
4. Add the sound effects in `Film.tsx`, cued from the scenes' own timing constants (section 6).
5. Render and master. **Listen to the MP4**, not the Studio preview.
6. Changed a line? Run `npm run voice` again. Only the changed lines are voiced again (they're cached), and the
   pictures, effects and music follow automatically.

---

## 4. Story structure (why it holds attention)

The film follows this order. Use the same shape for the new product:

| # | Beat | Gistspot example | Length |
|---|---|---|---|
| 1 | **Say what it is, immediately** | Logo builds, "The social app for your community.", the real app on a phone, "Live now" | 9.3 s |
| 2 | **The problem**, shown not told | Three local questions typed into a search bar, each with "0 results" | 5.6 s |
| 3–8 | **One feature per scene**, each with a live UI demo | Questions, Awareness, No names, Polls, Private chat, Safety | 3.5–6.0 s each |
| 9 | **Where it works** | Rows of campuses, towns, neighbourhoods | 3.6 s |
| 10 | **How to get it today**, exactly | Web app live now, search it on Google, install steps on two phones, stores coming soon | 9.0 s |
| 11 | **End: call to action + callback** | "Your community is already talking." The search bar comes back and types the app's name | 6.8 s |

(Lengths include the 12-frame slide that overlaps the next scene.)

Rules that came out of making it:
- The first sentence says what the product is. No mystery openings.
- Every scene shows the **real product UI doing the thing**. Don't use stock imagery or emoji standing in for the product.
- Positive tone, original copy, concrete local examples (real place names, believable posts).
- Show a feature, then say what it does: one idea per scene.
- Be exact about availability. Say what's live now and what's coming soon, and don't use official store badges until the apps launch.
- Make the ending call back to the opening (the empty searches in the hook become the search for the app at the end).

---

## 5. The voice: the exact recipe (why it never breaks)

Everything here is in `scripts/vo.py` (full source in Appendix A).

### 5.1 Build the audio first

```
script → voice → measure the waveform → scene lengths → animate to word cues → render → master
```

Each scene's length comes **from** its voice. Never animate first and then cut, stretch, or squeeze the voice.

### 5.2 How the script is written

Each entry in `SCRIPT` is `(scene, lead, min, text)`:

```python
SCRIPT = [
    ('intro', 8, 200, "Meet Gistspot, the social app for your local community. Talk freely with the people around you, on campus, in your neighbourhood, and across your city."),
    ('hook', 52, 175, "The internet knows everything, except what's happening around you."),
    ('ask', 6, 150, "But your neighbours do. Ask a question, and get real answers from people nearby, in minutes."),
    ...
]
```

- `lead`: design frames into the scene before the voice may start (gives a picture beat first; the hook waits 52).
- `min`: the shortest the scene may be, so its animation can finish even if the line is short.
- `text`: **one paragraph for the whole scene.**

Writing lines that sound good from TTS:
- One paragraph per scene, 7–30 words. Short sentences.
- Commas give a short breath ("Ask a question, and get real answers"). A question followed by an answer gives
  natural rise and fall ("Spot something important? Post an Awareness alert...").
- End every paragraph with a full stop.
- Write words the way they should be said. Avoid symbols, abbreviations and emoji in the narration. On-screen
  text lives separately in `src/script.ts` and can use them.
- If the voice says something different from the script, the word check (rule 2) stops the build. That is on purpose.

### 5.3 The 10 rules

| # | Rule | What goes wrong without it |
|---|---|---|
| 1 | **One paragraph per scene, one TTS request.** The whole line is read in one take. | Line-by-line clips restart the voice's intonation on every line, so it sounds choppy and robotic. |
| 2 | **Check every word was spoken.** Compare the words from the `WordBoundary` events with the script's words, and stop the build if they don't match. | TTS sometimes skips or swallows a word, and nobody notices until the film is posted. |
| 3 | **Trim from the waveform, not the TTS timestamps.** Measure loudness in 10 ms windows; anything below −48 dBFS is silence. Stop the build if the last word's timestamp ends more than 0.12 s after the measured audio end. | TTS timestamps can be off by hundreds of ms, so trimming by them clips the first or last syllable. |
| 4 | **Keep room tone:** 0.08 s before the first sound and 0.18 s after the last. Fade the clip edges over **6 ms**, inside that room tone. | Hard cuts at a sample that isn't zero make clicks and pops. |
| 5 | **Same gap between paragraphs: 12 frames (0.4 s).** The slide to the next scene starts 3 frames after the paragraph's last sound. | Uneven gaps make the narrator sound like they're stalling or rushing. |
| 6 | **Join everything into ONE continuous WAV** (48 kHz mono 16-bit), played by **one `<Audio>` at the top level** of the composition, **outside** `TransitionSeries`. | `TransitionSeries` overlaps neighbouring scenes during a transition. Audio inside scenes gets cut, doubled, or restarted at every scene change. Many small clips means many joins where a gap can appear. MP3 clips add encoder padding that shifts sync. |
| 7 | **One gain for the whole narration**, then a gentle look-ahead peak limiter (2.5 ms look-ahead, 80 ms release, −2 dBFS ceiling), repeated until −16 LUFS ±0.1. | Levelling each clip separately makes lines jump in volume. Without a limiter, loud consonants clip at broadcast level. |
| 8 | **Never speed up the voice in the video.** Set the pace in the TTS request (`rate: '+6%'`), and set the picture's pace with `speed: 1.3`. | `playbackRate` on a voice gives chipmunk pitch and artefacts. |
| 9 | **Cache each paragraph by a hash of (voice settings + text)**, and leave 2.5 s between requests, with up to 8 retries that wait longer each time (3 + 3k s). | Every request gives a slightly different take. Without the cache, a re-run changes lines you already approved. The free service also throttles rapid requests. |
| 10 | **Judge the sound only in the rendered MP4.** | Remotion Studio's preview stutters on a busy machine and sounds like skipping. That isn't in the file. |

### 5.4 All the constants in `vo.py`

```python
VOICE = {'voice': 'en-US-AndrewMultilingualNeural', 'rate': '+6%', 'pitch': '+0Hz'}
SR = 48000             # sample rate of everything
VO_LUFS = -16.0        # narration level before the final master
MUSIC_LUFS = -18.0     # music bed level before ducking
MAX_TP = -1.5          # music true-peak ceiling
GAP = 12               # frames of quiet between paragraphs (0.4 s)
AFTER = 3              # transition starts this many frames after a paragraph's last sound
END_HOLD = 54          # last frame stays up 1.8 s after the last word
PRE, POST = 0.08, 0.18 # room tone kept before / after each paragraph (s)
QUIET_DB = -48.0       # RMS in 10 ms windows below this = silence
# limiter: ceiling -2.0 dBFS, look-ahead 2.5 ms, release 80 ms; edge fades 6 ms
```

### 5.5 What `npm run voice` does, in order

1. For each scene in `SCRIPT`: if the cached take matches the hash of (voice + text), reuse it. Otherwise ask
   edge-tts for the paragraph, with word timings.
2. Convert the MP3 to a 48 kHz mono 16-bit WAV.
3. Measure the waveform: where the sound really starts and ends, and any long pauses inside.
4. **Word check:** spoken words = script words, or stop. Last word inside the audio, or stop.
5. **Place** each paragraph: it starts at the later of (scene start + `lead`) and (previous paragraph's end + `GAP`).
   The scene's length is `max(min, words end − scene start + transition + AFTER)`, or `+ END_HOLD` for the last scene.
6. **Assemble** one silent track the length of the film and drop each paragraph in at its frame, with room tone and
   6 ms edge fades.
7. Measure loudness (EBU R128). Apply one gain plus the limiter, and repeat until it measures −16 LUFS ±0.1.
   Warn if the true peak is above −1 dBTP.
8. Write `public/audio/vo/voiceover.wav`, `src/vo.json` (every paragraph's and word's start and end frame),
   and `src/timing.json` (scene order + lengths in design frames). Assert that the lengths add up to the narration's frame count.
9. Cut the music to the film's length and level it (section 6.1).
10. Print a table for each scene: duration, word count, **wpm**, start time, quiet before, and the longest pause inside (if over 0.5 s).

The result for the reference film:

| Scene | Words | Spoken | wpm |
|---|---|---|---|
| intro | 25 | 8.58 s | 175 |
| hook | 9 | 3.74 s | 144 |
| ask | 16 | 5.25 s | 183 |
| awareness | 13 | 5.08 s | 154 |
| speak | 12 | 3.27 s | 220 |
| polls | 11 | 2.75 s | 240 |
| chat | 15 | 3.81 s | 236 |
| safety | 7 | 3.34 s | 126 |
| places | 9 | 2.77 s | 195 |
| install | 30 | 8.25 s | 218 |
| end | 13 | 4.65 s | 168 |

### 5.6 Using a recorded human voice instead

Record each scene's paragraph in **one take**, in a quiet room, as a 48 kHz WAV. Then either:
- replace `synth()` in `vo.py` so it reads your files (and get word timings from a forced aligner, or
  `@remotion/openai-whisper`), keeping every other step; or
- for a single finished recording: save it as `public/audio/vo.wav`, set `AUDIO.vo = false` and
  `AUDIO.voiceover = 'vo.wav'` in `src/script.ts`. The film then plays it from frame 0 (you lose `cue()` and the
  automatic scene lengths).

---

## 6. Music and sound effects: the exact mix

### 6.1 Music preparation (in `vo.py`)

```python
dur = total_frames / 30 + 0.5
li, tp = loudness(MUSIC_SRC, '-t', dur)       # measure only the part that will be used
gain = min(-18.0 - li, -1.5 - tp)             # reach -18 LUFS without the peak going over -1.5 dBTP
ffmpeg -t {dur} -i audio-src/mixkit-158-happy-times.mp3 -af volume={gain}dB -ar 48000 -c:a libmp3lame -q:a 2 public/audio/music.mp3
```

### 6.2 Music in the film (in `Film.tsx`)

| Setting | Value |
|---|---|
| Volume when nobody speaks | **0.62** (×, linear) |
| Volume under the voice | **0.28** (about **−7 dB** lower) |
| Duck starts | 8 frames before the voice (reaches full duck 1 frame before) |
| Duck releases | from 2 to 16 frames after the voice stops |
| Pauses shorter than 30 frames (1 s) | **merged**, so the music stays down (no pumping) |
| Fade in / out | 4 frames in at the start, 40 frames out at the end |
| `AUDIO.musicVolume` | 0.32 (the formula divides by 0.32, so 0.32 = as designed) |

The duck curve is calculated once, as a `Float32Array` with one value per frame, and the `<Audio volume>` callback reads it.

### 6.3 Sound effect cues (in `Film.tsx`)

Every effect is a `<Sequence from={frame} durationInFrames={len} layout="none">` holding an `<Audio>`, with a fade
of `[0, 2, len − 4, len] → [0, 1, 1, 0]`. The default length is 40 frames. **Every cue frame comes from the same
constants the scene animation uses** (`at('chat', CHAT_TAP)`), never from frame numbers typed in by hand.

| Moment | Sound | Volume |
|---|---|---|
| Logo pops (intro frame 1) | pop | 0.30 |
| Logo glides into the header | whoosh | 0.16 |
| "Live now" card lands | pop | 0.22 |
| Each search typed (3×) | type, starting 6 / 45 / 90 frames into the recording | 0.50 |
| Each search sent | tap | 0.30 |
| **Every scene change** | whoosh | 0.28 |
| Answers arrive (2×) | pop | 0.30 |
| Post button tapped | tap | 0.45 |
| Accept tapped | tap | 0.45 |
| "All of Ghana" card | pop | 0.22 |
| Install taps (3×) | tap | 0.45 |
| Icon lands on the home screen | pop | 0.35 |
| End card | pop | 0.22 |
| App name typed into the search box | type, starting 30 frames into the recording | 0.42 |
| Search sent | tap | 0.40 |

Typing length = characters ÷ characters-per-frame + 2 frames, so the sound stops when the text stops. Starting
each typing cue at a different point (`trimBefore`) in **one** long recording stops repeats sounding copied.

### 6.4 Final master (`scripts/master.py`, runs after every render)

```
pass 1  ffmpeg -i film.mp4 -vn -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null -
pass 2  ffmpeg -i film.mp4 -c:v copy -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=…:measured_TP=…:measured_LRA=…:measured_thresh=…:offset=…:linear=true" -ar 48000 -c:a aac -b:a 320k -movflags +faststart tmp.mp4
pass 3  measure again and print:  "film.mp4: <before> LUFS -> -14.1 LUFS, true peak -1.0 dBTP"
```

- `linear=true` applies one smooth gain to the whole film, so the mix isn't squashed or pumped.
- `-c:v copy`: the picture is not re-encoded.
- `+faststart` lets the video start playing before it has fully downloaded.
- −14 LUFS / −1 dBTP is what TikTok, Reels, Shorts and YouTube expect, so they won't turn it down or squash it.

---

## 7. How the audio is wired in Remotion (`Film.tsx`)

```tsx
<AbsoluteFill>
  <TransitionSeries>{/* scenes + slide transitions: PICTURE ONLY, no audio inside scenes */}</TransitionSeries>

  <Audio src={staticFile('audio/music.mp3')} volume={(f) => duckedLevel(f)} />   {/* music, ducked */}
  <Audio src={staticFile('audio/vo/voiceover.wav')} name="narration" />          {/* ONE narration track */}
  {SFX_CUES.map((c) => (
    <Sequence from={c.f} durationInFrames={c.len ?? 40} layout="none">
      <Audio src={staticFile(`audio/sfx/${c.s}.mp3`)} trimBefore={c.trim} volume={(f) => c.v * fade(f)} />
    </Sequence>
  ))}
</AbsoluteFill>
```

All audio sits at the top level, timed in **real** frames of the whole film. Scenes never hold audio. The full
file is in Appendix A.

---

## 8. Remotion: everything used for smooth motion

### 8.1 Compositions

- `src/index.ts`: `registerRoot(Root)`. `remotion.config.ts`: `Config.setEntryPoint('src/index.ts')`.
- `src/Root.tsx` registers the **same `Film` component twice**: `Pitch-Vertical` 1080×1920 and `Pitch-Wide`
  1920×1080, both 30 fps, `durationInFrames = TOTAL`.
- `useLayout()` (in `anim.ts`) switches the layout by aspect ratio: gutter 76 / 110 px, card width 880 / 720, headline 100 / 86 px.
- Vertical safe zone: key content between y≈260 and y≈1500, and left of x≈960 (clear of the TikTok/Reels buttons and caption).

### 8.2 Design frames and SPEED (the smoothness trick)

All animation is written in **design frames** (30 per design-second). `timing.json` has `"speed": 1.3`, so the
picture plays 30% faster. The video still renders at a real 30 fps, and the voice is never stretched.

```ts
export const useT = () => useCurrentFrame() * TIMING.speed;                    // design frame now
export const realFrames = (designFrames: number) => Math.round(designFrames / SPEED);
export const startOf = (key) => /* sum of earlier scenes' real lengths minus transition overlaps */;
export const at = (key, designFrame) => startOf(key) + realFrames(designFrame); // real frame in the film
export const TOTAL = sum(realFrames(DUR[k])) - REAL_TRANSITION * (scenes - 1);
```

Every component calls `useT()`, never `useCurrentFrame()` directly. Python rounds the same way as JS:
`math.floor(x / SPEED + 0.5)`. Python's built-in `round()` rounds halves to the nearest even number, which is
one frame off from JS and would break the sync.

### 8.3 One shared timing file

`src/timing.json` holds `fps: 30`, `speed: 1.3`, `transition: 15` (design frames, so 12 real frames), `order`
and `dur`. **Python writes `order` and `dur`, and TypeScript reads all of it.** That makes it the only source of truth.

### 8.4 Land the picture on the voice: `cue()`

```ts
export const cue = (scene: SceneKey, word: string, fallback: number, nth = 1) => {
  const seg = VO.segments.find((s) => s.scene === scene);
  const hit = seg?.words.filter((w) => w.w === word)[nth - 1];
  return hit ? Math.round((hit.f - startOf(scene)) * SPEED) : fallback;
};

const HEAD = Math.max(50, Math.min(90, cue('intro', 'social', 58) - 8));   // headline rises before "social"
export const CHAT_TAP = Math.max(REQUEST + 30, Math.min(DUR.chat - 36, cue('chat', 'yes', 120) - 2)); // Accept on "yes"
const LINE2 = Math.max(DIM + 16, Math.min(170, cue('hook', 'except', 136) - 4));
```

- Pictures usually arrive **2–8 design frames before** their word (the eye should see it just before the ear hears it).
- Always clamp with `Math.max` / `Math.min` and give a fallback, so the layout still works if a line changes.
- Words are lowercase, without punctuation (`what's` keeps its apostrophe). `nth` picks a word that appears more than once.

Cues used in the reference: intro "social", "talk", "campus" · hook "except" · ask "ask", "answers", "minutes" ·
awareness "post" · chat "privately", "yes" · places "all" · install "home", "search", "live", "coming" · end "search".

### 8.5 One motion language (`brand.ts`)

```ts
export const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);        // fast out, soft landing: every entrance
export const EASE_INOUT = Easing.bezier(0.65, 0, 0.35, 1);  // transitions, logo glide, dimming
export const SPRING = { damping: 18, stiffness: 170, mass: 0.8 };
export const SPRING_POP = { damping: 11, stiffness: 240, mass: 0.6 };   // small things popping in
export const SPRING_CARD = { damping: 15, stiffness: 120, mass: 0.9 };  // cards: dropped paper, small settle
```

Use only these (plus the phone rise `{damping: 18, stiffness: 90, mass: 1}` and the Live card `{damping: 15, stiffness: 150, mass: 0.8}`).
Springs run with `fps: 30` on design frames (`useSpringAt(delay, config)`).

`ease(frame, start, dur)` = `interpolate(frame, [start, start + dur], [0, 1], { easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })`.
**Every `interpolate` is clamped**, so nothing overshoots before or after its moment.

### 8.6 Animation patterns and their timings

| Pattern | How |
|---|---|
| **Scene transition** | `TransitionSeries.Transition` with `slide({ direction: 'from-right' })`, `linearTiming({ durationInFrames: 12, easing: EASE_INOUT })`, a whoosh on each |
| **Headline** (`Display`) | Each word rises from 112% inside its own `overflow: hidden` mask, a 16-frame ease, **2-frame stagger**. Then a jade marker underline draws under the key word (`scaleX` over 18 frames, 8 frames after the last word). The mask gets `paddingBottom: 0.16em; marginBottom: -0.16em` so descenders aren't cut off. Optional exit: fade + rise over 10 frames |
| **Label** (`Mono`) | Fade in and rise 10 px over 12 frames |
| **Body** (`Body`) | Fade in and rise 14 px over 14 frames, `textWrap: balance` |
| **Cards** (`NoteCard`) | `SPRING_CARD`: rise 180 px (or slide 320 px from the side), rotation settles from ±9° to a slight tilt, opacity done by 35% of the spring. Optional "tape" strip lands 9 frames later |
| **Logo** (`Mark`) | Tile pops (`SPRING_POP`), the G draws with `strokeDashoffset` over 16 frames (from frame 6), the dot pops at frame 18. Then the whole lockup glides from big in the centre into the header (`EASE_INOUT`, 24 frames) |
| **Rings** | SVG circles growing and fading on a loop: `((t + i*14) % 56) / 56`, so they repeat seamlessly |
| **Typing** | Characters shown = `floor((t − start) × cps)`: 1.6–1.8 chars per design frame for the long searches in the hook, and 0.55 for the short app name at the end (slower, so it can be read). The caret blinks every 10 frames only *after* typing ends. A press = `scale(0.985)` for 6 frames, plus a jade progress sweep |
| **Phone rise** | Spring from below the frame, then the feed inside scrolls slowly (`interpolate` 0 → 170 pt) |
| **Particles / confetti** | Remotion `random('seed' + i)` for position, size, rotation and delay. **Never** `Math.random()` or `Date` |
| **Hold** | Last frame stays 54 frames (1.8 s) after the last word |

Deterministic rendering matters because Remotion renders frames **in parallel and out of order**. Anything random
or time-based makes frames disagree with each other, and that shows up as jitter.

---

## 9. Why the UI looks like the real product

- **The app UI is rebuilt as React components, not screenshots.** It's drawn at the app's native **390 pt** width
  and scaled with a CSS transform, so it's vector-sharp at any size and every part can animate:
  ```tsx
  export const PT_W = 390;
  const k = w / PT_W;
  <div style={{ position: 'absolute', width: PT_W, height: h / k, transform: `scale(${k})`, transformOrigin: '0 0' }}>{children}</div>
  ```
- **Copied, not invented.** Colours are sampled from the app's own tokens. Card proportions, labels, durations,
  "Useful/Questionable" and so on come from the real components (`PostCard.tsx`, `compose.tsx`). The installed-app
  icon is the real icon file. Install steps match the app's own install guide. Every claim was checked against the codebase.
- **The phone** (`PhoneFrame`) is a generic dark frame: bezel = 2.8% of the width, corner radius = 14% of the width,
  a pill cutout for iPhone and a hole-punch for Android, plus a soft shadow (`0 50px 90px -35px rgba(0,0,0,0.55)`).
  It doesn't copy any brand's hardware.
- **Real app chrome:** status bar (time, signal, wifi, battery drawn in SVG), app header, tabs (Latest · For you ·
  Nearby), post cards, floating compose button, tab bar, all at true app scale.
- **Store marks** are simple vector marks labelled "coming soon". They aren't the official download badges.
- **Store-screen layout** for every feature scene (`ChapterFrame`): logo bar, then feature badge, big headline,
  one line of explanation, live demo (bottom band in 9:16, right half in 16:9), and page dots. The film and
  the store screenshots look like one brand.
- **Backgrounds** alternate per scene: paper, dark, split dark, split green, night top. Soft ring patterns sit on the dark panels.
- **Shadows:** cards `0 28px 50px -18px rgba(24,34,28,0.24), 0 2px 6px rgba(24,34,28,0.06)`; 1.5 px hairline borders.

### Design tokens used (replace with the new brand's)

```
paper #F4F2EC   ink #222823   inkSoft #4A514C   muted #6E756F   hair #D9D5CA
green #1D7057   jade #57B89B  dark #1A1E1B      coral #EA4359   white #FFFFFF
card tints: sky #E7EFFB  mint #DDEFE7  butter #FEF3E2  lavender #EDE8F5  rose #F1E5ED  biscuit #E8DBD2
```

### Typography settings

| Use | Font | Settings |
|---|---|---|
| Headline | Bricolage Grotesque 800, `opsz` 96 | 100 px (9:16) / 86–92 px (16:9), line-height 0.95, letter-spacing −0.052em |
| Card title | Bricolage Grotesque 700, `opsz` 14 | 44 px, line-height 1.17, letter-spacing −0.012em, `textWrap: pretty` |
| Body | Instrument Sans 400 | 38 px (9:16) / 32–34 px (16:9), line-height 1.3, `textWrap: balance` |
| Label | DM Mono | 26 px, uppercase, letter-spacing 0.14em |

---

## 10. Render and delivery

```bash
remotion render Pitch-Vertical out/film-9x16.mp4 --codec=h264 --crf=16 --x264-preset=slow \
  --color-space=bt709 --pixel-format=yuv420p && python scripts/master.py out/film-9x16.mp4
```

```ts
// remotion.config.ts
Config.setEntryPoint('src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setCrf(16);          // high quality; platforms re-compress anyway, so start clean
Config.setOverwriteOutput(true);
```

| Flag | Why |
|---|---|
| `--crf=16` | Visually lossless. Platforms re-compress, so give them a clean source |
| `--x264-preset=slow` | Better picture for the same file size. It only costs render time |
| `--color-space=bt709` | Stops colours shifting or looking washed out on phones and in browsers |
| `--pixel-format=yuv420p` | The format every phone and platform plays |

Also produced:
- **Captions** (`scripts/captions.py`): an `.srt` built from the word timings, one sentence per caption where
  possible, at most 74 characters split into 2 balanced lines (~40 per line), each caption ending 8 frames after
  its last word or 1 frame before the next. Upload it to YouTube, Facebook, LinkedIn and X. TikTok and Instagram make their own.
- **Review stills** (`scripts/stills.mjs`): bundles once, then renders the chosen frames to PNG. It's much faster
  than rendering the whole film to check a layout.
- **Cover images**: render a still of a strong frame for each format.

---

## 11. Checklist before shipping

**Voice**
- [ ] `npm run voice` prints "all words spoken" for every scene, with no errors or warnings.
- [ ] No pause inside a paragraph longer than 0.5 s (the script reports any).
- [ ] Pace is near the reference: about 185 wpm on average, with scenes between about 125 and 240 wpm.
- [ ] Narration measures −16 LUFS ±0.1, and its true peak is below −1 dBTP.

**Mix**
- [ ] Watched and listened to the **rendered MP4** on a phone speaker *and* on headphones.
- [ ] Every word is clear over the music, and the music doesn't pump between sentences.
- [ ] Every tap, pop, typing sound and whoosh lands on its picture.
- [ ] `master.py` printed about −14 LUFS and a true peak ≤ −1.0 dBTP.

**Picture**
- [ ] Every key moment lands on its word (`cue()`), and nothing appears late.
- [ ] No fallback font flashes on any frame. Check the first frame of each scene in the stills.
- [ ] The 9:16 version keeps nothing important under the platform's buttons or caption area.
- [ ] Both formats render, and both are mastered.

**File**
- [ ] `ffprobe` shows H.264, yuv420p, bt709, 30 fps, AAC 48 kHz.

**Content**
- [ ] The first sentence says what the product is.
- [ ] Every product claim and install step is checked against the real product. Made-up posts and people are fictional.
- [ ] `CREDITS.md` lists the source and licence of every music, SFX and voice file.
- [ ] `.srt` captions are generated.

---

## 12. Watch-outs

- **Internet is needed** to voice the narration (edge-tts) and to render (Google Fonts). To render offline, ship the
  fonts in `public/fonts/` and load them with `@remotion/fonts`.
- **Windows:** the scripts already handle it (`npx` is called with `shell=True` on win32). Paths with spaces are fine.
- **Studio preview stutter** is not in the file. Always judge the MP4.
- **The edge-tts service throttles** rapid requests. The script waits and retries by itself. If it still fails,
  wait a minute and run it again. Lines already voiced come from the cache.
- **Remotion licence:** free for individuals and companies of up to 3 people. Check remotion.dev/license for bigger teams.
- **edge-tts** is free, unofficial use of Microsoft's online voices. For paid ad campaigns, consider a licensed voice
  (Azure Speech offers the same Andrew voice under a paid licence) or a recorded human voice. The pipeline stays the
  same; only `synth()` changes.
- **Music licence proof:** keep the full original in `audio-src/` and its source and licence in `CREDITS.md`. If a
  platform flags the music, that file is your proof.

---

## Appendix A. Full source of the files to reuse

Copied straight from the Gistspot repo (`video/`). `script.ts` holds Gistspot's words and posts; keep its helpers
and the `AUDIO` block, and replace the content. `Film.tsx` imports Gistspot's scenes; keep the audio half exactly,
and rewrite `SCENES` and `SFX_CUES` for the new scenes.

### `package.json`

```json
{
  "name": "gistspot-pitch-video",
  "private": true,
  "version": "1.0.0",
  "description": "Gistspot motion pitch video, built with Remotion",
  "scripts": {
    "studio": "remotion studio",
    "render": "remotion render Pitch-Vertical out/gistspot-pitch-9x16.mp4 --codec=h264 --crf=16 --x264-preset=slow --color-space=bt709 --pixel-format=yuv420p && python scripts/master.py out/gistspot-pitch-9x16.mp4",
    "render:wide": "remotion render Pitch-Wide out/gistspot-pitch-16x9.mp4 --codec=h264 --crf=16 --x264-preset=slow --color-space=bt709 --pixel-format=yuv420p && python scripts/master.py out/gistspot-pitch-16x9.mp4",
    "render:all": "npm run render && npm run render:wide && npm run captions",
    "still": "remotion still Pitch-Vertical out/frame.png --frame=200",
    "typecheck": "tsc --noEmit",
    "voice": "python scripts/vo.py",
    "captions": "python scripts/captions.py"
  },
  "dependencies": {
    "@remotion/cli": "4.0.541",
    "@remotion/fonts": "4.0.541",
    "@remotion/google-fonts": "4.0.541",
    "@remotion/transitions": "4.0.541",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "remotion": "4.0.541"
  },
  "devDependencies": {
    "@types/react": "18.3.12",
    "typescript": "5.6.3"
  }
}
```

### `remotion.config.ts`

```ts
import { Config } from '@remotion/cli/config';

Config.setEntryPoint('src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setCrf(16); // high quality; social platforms re-compress anyway
Config.setOverwriteOutput(true);
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "remotion.config.ts"]
}
```

### `src/index.ts`

```ts
import { registerRoot } from 'remotion';

import { Root } from './Root';

registerRoot(Root);
```

### `src/Root.tsx`

```tsx
import React from 'react';
import { Composition } from 'remotion';

import './brand';
import { Film } from './Film';
import { FPS, TOTAL } from './script';

export const Root: React.FC = () => (
  <>
    {/* TikTok, Reels, Shorts, WhatsApp Status */}
    <Composition id="Pitch-Vertical" component={Film} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
    {/* Pitch deck, YouTube, website */}
    <Composition id="Pitch-Wide" component={Film} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
  </>
);
```

### `src/timing.json`

```json
{
  "_note": "Single source of truth for timing, read by the film (src/script.ts) and the voice script (scripts/vo.py). Scene lengths are in DESIGN frames (30 per design-second); SPEED plays the whole film faster without touching the audio sync.",
  "fps": 30,
  "speed": 1.3,
  "transition": 15,
  "order": [
    "intro",
    "hook",
    "ask",
    "awareness",
    "speak",
    "polls",
    "chat",
    "safety",
    "places",
    "install",
    "end"
  ],
  "dur": {
    "intro": 363,
    "hook": 218,
    "ask": 235,
    "awareness": 230,
    "speak": 159,
    "polls": 138,
    "chat": 179,
    "safety": 162,
    "places": 139,
    "install": 352,
    "end": 264
  }
}
```

### `src/Film.tsx`

```tsx
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from 'remotion';

import { EASE_INOUT } from './brand';
import { ASK_T, CHAT_TAP, ChAsk, ChAwareness, ChChat, ChPolls, ChSafety, ChSpeak, POST_TAP } from './scenes/Chapters';
import { Hook, HOOK_T } from './scenes/Hook';
import { Intro, INTRO_T } from './scenes/Intro';
import { End, END_T, GHANA, Install, INSTALL_T, Places } from './scenes/Payoff';
import { at, AUDIO, DUR, HOOK, ORDER, REAL_TRANSITION, realFrames, type SceneKey, startOf, TOTAL } from './script';
import VO from './vo.json';

const SCENES: Record<SceneKey, React.FC> = {
  intro: Intro,
  hook: Hook,
  ask: ChAsk,
  awareness: ChAwareness,
  speak: ChSpeak,
  polls: ChPolls,
  chat: ChChat,
  safety: ChSafety,
  places: Places,
  install: Install,
  end: End,
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/* ---------------- Sound effects (timed from the scenes' own beats, so they can't drift) ---------------- */
type Cue = { f: number; s: string; v: number; len?: number; trim?: number };
const TYPE_TRIM = [6, 45, 90]; // three different stretches of one continuous typing recording
const SFX_CUES: Cue[] = [
  // the logo pops, then glides into place
  { f: at('intro', 1), s: 'pop', v: 0.3 },
  { f: at('intro', INTRO_T.glide), s: 'whoosh', v: 0.16 },
  { f: at('intro', INTRO_T.live), s: 'pop', v: 0.22 },
  // three searches typed, each one sent
  ...HOOK_T.q.flatMap((q, i): Cue[] => {
    const typing = HOOK.queries[i].length / q.cps;
    const from = Math.max(0, q.start);
    return [
      { f: at('hook', from), s: 'type', v: 0.5, len: Math.max(6, realFrames(q.start + typing + 2 - from)), trim: TYPE_TRIM[i] },
      { f: at('hook', q.enter), s: 'tap', v: 0.3 },
    ];
  }),
  // page swipes between scenes
  ...ORDER.slice(1).map((k): Cue => ({ f: startOf(k), s: 'whoosh', v: 0.28 })),
  // things arriving / being tapped
  { f: at('ask', ASK_T.answers[0]), s: 'pop', v: 0.3 },
  { f: at('ask', ASK_T.answers[1]), s: 'pop', v: 0.3 },
  { f: at('awareness', POST_TAP), s: 'tap', v: 0.45 },
  { f: at('chat', CHAT_TAP), s: 'tap', v: 0.45 },
  { f: at('places', GHANA), s: 'pop', v: 0.22 },
  { f: at('install', INSTALL_T.tapA), s: 'tap', v: 0.45 },
  { f: at('install', INSTALL_T.tapB), s: 'tap', v: 0.45 },
  { f: at('install', INSTALL_T.iconIn), s: 'pop', v: 0.35 },
  { f: at('install', INSTALL_T.tapC), s: 'tap', v: 0.45 },
  { f: at('end', 26), s: 'pop', v: 0.22 },
  // "Search Gistspot on Google": the name is typed into the box, then sent
  ...(END_T.type > 0
    ? [
        { f: at('end', END_T.type), s: 'type', v: 0.42, len: realFrames(END_T.go - END_T.type - 4), trim: 30 },
        { f: at('end', END_T.go), s: 'tap', v: 0.4 },
      ]
    : []),
];

/* ---------------- Music: ducked under the narration ---------------- */
const MUSIC_OPEN = 0.62; // when nobody is speaking
const MUSIC_UNDER = 0.28; // under the voice (~-7 dB), so every word stays clear on a phone speaker
// Speech, merged across the short pauses between paragraphs so the music doesn't pump up and down.
const SPEECH = VO.segments.reduce<[number, number][]>((out, s) => {
  const last = out[out.length - 1];
  if (last && s.from - last[1] < 30) last[1] = s.to;
  else out.push([s.from, s.to]);
  return out;
}, []);
const duckCurve = (() => {
  const a = new Float32Array(TOTAL + 1);
  for (const [from, to] of SPEECH) {
    for (let f = Math.floor(from - 8); f <= Math.ceil(to + 16); f++) {
      if (f < 0 || f > TOTAL) continue;
      const rise = interpolate(f, [from - 8, from - 1], [0, 1], clamp);
      const fall = interpolate(f, [to + 2, to + 16], [1, 0], clamp);
      a[f] = Math.max(a[f], Math.min(rise, fall));
    }
  }
  return a;
})();

export const Film: React.FC = () => {
  const children: React.ReactNode[] = [];
  ORDER.forEach((k, i) => {
    if (i > 0) {
      children.push(
        <TransitionSeries.Transition key={`t-${k}`} presentation={slide({ direction: 'from-right' })} timing={linearTiming({ durationInFrames: REAL_TRANSITION, easing: EASE_INOUT })} />,
      );
    }
    const Scene = SCENES[k];
    children.push(
      <TransitionSeries.Sequence key={k} durationInFrames={realFrames(DUR[k])} name={k}>
        <Scene />
      </TransitionSeries.Sequence>,
    );
  });

  const voiceOn = AUDIO.vo || Boolean(AUDIO.voiceover);

  return (
    <AbsoluteFill style={{ background: '#F4F2EC' }}>
      <TransitionSeries>{children}</TransitionSeries>

      {AUDIO.music ? (
        <Audio
          src={staticFile(`audio/${AUDIO.music}`)}
          volume={(f) => {
            const duck = voiceOn ? duckCurve[Math.min(TOTAL, Math.max(0, f))] : 0;
            const level = MUSIC_OPEN - (MUSIC_OPEN - MUSIC_UNDER) * duck;
            const fade = interpolate(f, [0, 4, TOTAL - 40, TOTAL], [0, 1, 1, 0], clamp);
            return level * fade * (AUDIO.musicVolume / 0.32);
          }}
        />
      ) : null}

      {/* the narration: one continuous, pre-timed track (scripts/vo.py) */}
      {AUDIO.vo ? <Audio src={staticFile(VO.src)} name="narration" /> : null}
      {AUDIO.voiceover ? <Audio src={staticFile(`audio/${AUDIO.voiceover}`)} /> : null}

      {AUDIO.sfx
        ? SFX_CUES.map((c, i) => {
            const len = c.len ?? 40;
            return (
              <Sequence key={`s${i}`} from={c.f} durationInFrames={len} layout="none" name={`sfx ${c.s}`}>
                <Audio
                  src={staticFile(`audio/sfx/${c.s}.mp3`)}
                  trimBefore={c.trim}
                  volume={(f) => c.v * interpolate(f, [0, 2, len - 4, len], [0, 1, 1, 0], clamp)}
                />
              </Sequence>
            );
          })
        : null}
    </AbsoluteFill>
  );
};
```

### `src/script.ts`

```ts
// EDIT THIS FILE to change on-screen words, posts, places and audio.
// The narration lives in scripts/vo.py, and running it rewrites the scene lengths (src/timing.json).
// 30 frames = 1 second. "\n" in a headline forces a line break.
//
// Story: what Gistspot is (intro) → the internet can't tell you what's happening around
// you (hook) → your neighbours can: the app's features → where it works → how to install it today.
import type { AliasKey } from './brand';
import TIMING from './timing.json';
import VO from './vo.json';

// Scene lengths and SPEED live in src/timing.json (shared with scripts/vo.py).
// Scenes are designed in "design frames" (30 per design-second). SPEED plays the whole
// film faster: 1.3 = 30% quicker. The video itself always renders at 30 fps.
export const FPS = TIMING.fps;
export const SPEED = TIMING.speed;
export const TRANSITION = TIMING.transition;
export const DUR = TIMING.dur;
export type SceneKey = keyof typeof DUR;
export const ORDER = TIMING.order as SceneKey[];

/** Real (30 fps) frame counts after SPEED. */
export const realFrames = (designFrames: number) => Math.round(designFrames / SPEED);
export const REAL_TRANSITION = realFrames(TRANSITION);
export const TOTAL = ORDER.reduce((a, k) => a + realFrames(DUR[k]), 0) - REAL_TRANSITION * (ORDER.length - 1);

/** Real frame at which a scene starts in the finished film. */
export const startOf = (key: SceneKey) => {
  let t = 0;
  for (const k of ORDER) {
    if (k === key) return t;
    t += realFrames(DUR[k]) - REAL_TRANSITION;
  }
  return t;
};
/** Real frame of a moment `designFrame` into a scene. */
export const at = (key: SceneKey, designFrame: number) => startOf(key) + realFrames(designFrame);

/**
 * Design frame inside `scene` where the narrator starts saying `word` (its `nth` time there),
 * read from src/vo.json. Key moments use this so the picture lands on the voice, and stays
 * in sync after the script is re-voiced. If the word is no longer in that scene's line,
 * `fallback` is used.
 */
export const cue = (scene: SceneKey, word: string, fallback: number, nth = 1) => {
  const seg = VO.segments.find((s) => s.scene === scene);
  const hit = seg?.words.filter((w) => w.w === word)[nth - 1];
  return hit ? Math.round((hit.f - startOf(scene)) * SPEED) : fallback;
};

export const HOOK = {
  stamp: 'Tuesday · 7:42 am · Accra',
  placeholder: 'Search the internet',
  queries: ['is there light in madina right now', 'is kaneshie underpass flooded', 'what’s happening around me right now'],
  noResults: '0 results',
  line1: 'The internet\nknows everything.',
  line2: 'Except what’s\nhappening\naround you.',
  underline: 'you.',
};

export interface MiniPost {
  place: string;
  time: string;
  body: string;
  kind?: 'awareness' | 'poll' | 'question';
  poll?: [string, number][];
  up?: number;
  comments?: number;
  tint?: string;
}

// The opening: what Gistspot is, in one look.
export const INTRO = {
  eyebrow: 'Introducing',
  headline: 'The social app\nfor your community.',
  underline: 'community.',
  sub: 'Talk freely with the people around you, on campus, in your neighbourhood and across your city.',
  callouts: ['Your community', 'Live conversations', 'No names'],
  place: 'Madina',
  availability: { label: 'Live now', url: 'gistspot.app', sub: 'Web app\niPhone & Android' },
  feed: [
    { place: 'Madina', time: '2m', body: 'Light just came back on the Zongo Junction side.', up: 48, comments: 12 },
    { place: 'Madina', time: '18m', kind: 'awareness', body: 'Road works at the market junction until 4pm. Use the Adenta road.', up: 96, comments: 21 },
    { place: 'Madina', time: '1h', kind: 'poll', body: 'Best time for the Saturday clean-up?', poll: [['7 am', 64], ['4 pm', 36]], up: 30, comments: 9 },
    { place: 'Madina', time: '2h', kind: 'question', body: 'Any good tailor near Zongo Junction? Need a kaba sewn by Sunday.', up: 22, comments: 17 },
  ] as MiniPost[],
};

export interface Chapter {
  n: number;
  badge: string;
  headline: string;
  underline?: string;
  colorWord?: string;
  sub?: string;
}

export const CHAPTERS: Record<'ask' | 'awareness' | 'speak' | 'polls' | 'chat' | 'safety', Chapter> = {
  ask: { n: 1, badge: 'Questions', headline: 'Ask your area\nanything.', underline: 'anything.', sub: 'Answers from people who are actually nearby.' },
  awareness: { n: 2, badge: 'Awareness', headline: 'Warn your whole\narea in seconds.', colorWord: 'seconds.' },
  speak: { n: 3, badge: 'No names', headline: 'Say what you\nreally think.', underline: 'think.', sub: 'A fresh name in every thread. No profile. No followers.' },
  polls: { n: 4, badge: 'Polls', headline: 'Ask everyone\nat once.', underline: 'once.', sub: 'Live results from your whole area.' },
  chat: { n: 5, badge: 'Private chat', headline: 'Talk privately.\nOnly if you both\nsay yes.', colorWord: 'yes.', sub: 'No numbers swapped. Block anyone, anytime.' },
  safety: { n: 6, badge: 'Safety', headline: 'Kept kind by\nthe people in it.', underline: 'kind', sub: 'Your community decides what stays.' },
};

// Fictional posts written for the film — places vary so no single school or town owns the story.
export const POSTS = {
  ask: {
    place: 'Madina',
    time: 'now',
    question: 'Is there light in Madina right now?',
    answers: [
      { alias: 'tealWeaver' as AliasKey, time: '1m', text: 'Yes! Came back 10 minutes ago on our side.' },
      { alias: 'oliveGecko' as AliasKey, time: '2m', text: 'Still off near the market. ECG says 6pm.' },
    ],
    stamp: 'Answered in 2 minutes',
  },
  awareness: {
    place: 'Kaneshie',
    time: 'now',
    body: 'Water is high at the Kaneshie underpass. Cars are turning back. Use the Mataheko road.',
    status: 'Prioritized in this community',
    ends: 'Ends in 6h',
    useful: 62,
    questionable: 1,
    update: { time: '40 min later', text: 'Water is going down. One lane is open again.' },
    checks: ['Stays on top for your area', 'Neighbours mark it useful', 'Ends on its own'],
  },
  speak: {
    place: 'KNUST',
    time: '9m ago',
    alias: 'goldenKente' as AliasKey,
    body: 'Our hall needs a 24-hour reading room before exams. Who’s with me?',
    reply: 'Same. Let’s take it to the SRC this week.',
    facts: ['No profile', 'No followers', 'Email never shown'],
    threads: ['goldenKente', 'quietWeaver', 'blueSunbird'] as AliasKey[],
  },
  polls: {
    place: 'Takoradi',
    votes: '1,204 votes',
    question: 'Should trotros take MoMo?',
    options: [['Yes, finally', 81], ['Cash only', 11], ['Depends on the mate', 8]] as [string, number][],
  },
  chat: {
    place: 'Cape Coast',
    time: '14m ago',
    body: 'Anyone into film photography in Cape Coast? Weekend photo walk at the castle?',
    reply: 'Me! I shoot every Saturday.',
    from: 'blueSunbird' as AliasKey,
  },
  safety: {
    place: 'Accra',
    time: '3m ago',
    reportTag: 'Reported · insult',
    hidden: 'Hidden by the community',
    hiddenSub: '5 neighbours voted it down',
    checks: ['To post in a place, you have to be there', 'Report or block in one tap', 'Filters catch spam, harassment and private info'],
  },
};

// Examples only — the app has campuses, towns and neighbourhoods all over Ghana.
export const PLACES = {
  label: 'Campuses · towns · neighbourhoods',
  headline: 'From your campus\nto your street.',
  colorWord: 'street.',
  sub: 'Join where you study, where you live, or the whole country.',
  rows: [
    { label: 'Universities', items: ['UG Legon', 'KNUST', 'UCC', 'UPSA', 'GIMPA', 'Ashesi', 'UEW', 'UDS Tamale', 'UHAS', 'UMaT', 'UENR', 'KsTU', 'HTU', 'CKT-UTAS', 'SDD-UBIDS', 'Academic City'] },
    { label: 'Towns & cities', items: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast', 'Ho', 'Koforidua', 'Sunyani', 'Bolgatanga', 'Wa', 'Tema', 'Kasoa'] },
    { label: 'Neighbourhoods', items: ['Madina', 'East Legon', 'Osu', 'Spintex', 'Adenta', 'Nima', 'Kejetia', 'Bantama', 'Amasaman', 'Cantonments', 'Maamobi', 'Accra Central'] },
  ],
  ghana: { title: 'All of Ghana', sub: 'One space the whole country can join', badge: 'Anyone can post' },
  note: 'Examples · find yours in the app',
};

export const INSTALL = {
  badge: 'Available now · Web app',
  headline: 'No app store needed.',
  underline: 'needed.',
  sub: 'Install it from your browser in seconds. It’s free.',
  status: {
    now: { label: 'Available now', url: 'gistspot.app', text: 'Or just search “Gistspot” on Google' },
    soon: { label: 'Coming soon', stores: ['Google Play', 'App Store'] },
  },
  iphone: { label: 'iPhone · Safari', steps: 'Share → Add to Home Screen', place: 'Ho' },
  android: { label: 'Android · Chrome', steps: 'Menu → Install app', place: 'Tamale' },
  url: 'gistspot.app',
};

export const END = {
  tagline: 'Say what you can’t say out loud.',
  headline: 'Your community is\nalready talking.',
  colorWord: 'talking.',
  available: 'Available now as a web app',
  url: 'gistspot.app',
  search: 'Gistspot', // typed into the search box as the narrator says it
  searchHint: 'Search',
  install: 'Just search it on Google, or go to gistspot.app. Free on iPhone and Android.',
  stores: ['Google Play', 'App Store'],
  soonTag: 'Coming soon',
  share: 'Send this to your group chat',
  insideLabel: 'Inside the app',
  inside: ['Questions', 'Awareness', 'No names', 'Polls', 'Private chat', 'Safety'],
};

// AUDIO — drop files into public/audio/ and set names here (or leave null/false).
export const AUDIO: {
  vo: boolean; // generated voiceover clips (python scripts/vo.py → src/vo.json)
  voiceover: string | null; // or one recorded file, e.g. 'vo.wav' — starts at frame 0
  music: string | null; // e.g. 'music.mp3' — ducked automatically under the voiceover
  musicVolume: number;
  sfx: boolean; // public/audio/sfx/{whoosh,pop,tap,type}.wav
} = {
  vo: true,
  voiceover: null,
  music: 'music.mp3', // "Happy Times" by Alejandro Magaña (A. M.), Mixkit Stock Music Free License — see CREDITS.md
  musicVolume: 0.32,
  sfx: true,
};
```

### `src/brand.ts`

```ts
// Gistspot film design system.
// Colours are sampled from the store screens (which use the app's own tokens in
// mobile/src/theme/tokens.ts). Type: Bricolage Grotesque (display + card titles),
// Instrument Sans (body), DM Mono (labels).
import { loadVariableFont as loadBricolage } from '@remotion/google-fonts/BricolageGrotesque';
import { loadFont as loadDMMono } from '@remotion/google-fonts/DMMono';
import { loadFont as loadInstrument } from '@remotion/google-fonts/InstrumentSans';
import { Easing } from 'remotion';

export const DISPLAY = loadBricolage('normal', { subsets: ['latin'] }).fontFamily;
export const BODY = loadInstrument('normal', { weights: ['400', '500', '600'], subsets: ['latin'] }).fontFamily;
export const MONO = loadDMMono('normal', { weights: ['400', '500'], subsets: ['latin'] }).fontFamily;

/** Bricolage optical sizes: 96 = tight headline cut, 14 = open text cut used on cards. */
export const OPSZ = { display: 96, text: 14 } as const;

export const C = {
  paper: '#F4F2EC',
  ink: '#222823',
  inkSoft: '#4A514C',
  muted: '#6E756F',
  hair: '#D9D5CA',
  surfaceSoft: '#ECE8E1',
  green: '#1D7057',
  jade: '#57B89B',
  jadeSoft: '#DDEFE7',
  mint: '#C8E7DB',
  dark: '#1A1E1B',
  darkCard: '#232A25',
  darkReply: '#28332B',
  darkMuted: '#A6B2AE',
  ring: '#2C322C',
  black: '#0B0C0C',
  coral: '#EA4359',
  white: '#FFFFFF',
  tape: 'rgba(227,221,201,0.94)',
  // Card tints (app "harmattan" tints)
  sky: '#E7EFFB',
  mintCard: '#DDEFE7',
  butter: '#FEF3E2',
  lavender: '#EDE8F5',
  rose: '#F1E5ED',
  biscuit: '#E8DBD2',
  // Awareness treatment, straight from PostCard.tsx
  amber: '#B77821',
  amberBg: '#FFF9EF',
  amberBorder: '#F2E2C2',
  amberDot: '#D69438',
  amberText: '#A66D20',
} as const;

// Thread names follow server/src/lib/alias.ts: the colour word is the colour you see.
export const ALIASES = {
  tealWeaver: { name: 'Teal Weaver', hex: '#2A94A8', glyph: '◇' },
  goldenKente: { name: 'Golden Kente', hex: '#B5862A', glyph: '△' },
  quietWeaver: { name: 'Quiet Owl', hex: '#9467B0', glyph: '○' },
  blueSunbird: { name: 'Blue Sunbird', hex: '#5A6FD0', glyph: '◇' },
  oliveGecko: { name: 'Olive Gecko', hex: '#64924A', glyph: '△' },
  roseHeron: { name: 'Rose Heron', hex: '#C95B86', glyph: '○' },
} as const;
export type AliasKey = keyof typeof ALIASES;

export const MARK = {
  viewBox: '0 0 24 24',
  bubble:
    'M8 2.5h8a5.5 5.5 0 0 1 5.5 5.5v7a5.5 5.5 0 0 1-5.5 5.5h-5.7l-4.1 2.2a.65.65 0 0 1-.95-.57v-2.36A5.5 5.5 0 0 1 2.5 15V8A5.5 5.5 0 0 1 8 2.5Z',
  g: 'M13.5 8.1a4.3 4.3 0 1 0 .7 6.1v-2.3h-3.5',
  gLength: 32,
  gStroke: 2.2,
  dot: { cx: 17.8, cy: 15.2, r: 1.15 },
};

// One easing family for the whole film: fast out, soft landing.
export const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
export const EASE_INOUT = Easing.bezier(0.65, 0, 0.35, 1);

export const SPRING = { damping: 18, stiffness: 170, mass: 0.8 };
export const SPRING_POP = { damping: 11, stiffness: 240, mass: 0.6 };
/** Cards land like paper dropped on a table: quick, a little settle. */
export const SPRING_CARD = { damping: 15, stiffness: 120, mass: 0.9 };
```

### `src/components/anim.ts`

```ts
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { EASE, SPRING } from '../brand';
import TIMING from '../timing.json';

/** Design frames per design-second. Animations are written in these units. */
export const DESIGN_FPS = 30;

/**
 * The frame in design units. Every animation reads this instead of useCurrentFrame(),
 * so the global SPEED (src/timing.json) speeds the whole film up evenly while the
 * video still renders at 30 fps and the audio stays in sync.
 */
export const useT = () => useCurrentFrame() * TIMING.speed;

/** 0→1 eased over `dur` frames starting at `start`. */
export const ease = (frame: number, start: number, dur: number, easing = EASE) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const useSpringAt = (delay = 0, config: { damping: number; stiffness: number; mass: number } = SPRING) => {
  const t = useT();
  return spring({ frame: t - delay, fps: DESIGN_FPS, config });
};

/**
 * Layout for 9:16 and 16:9.
 * Vertical keeps key content between y≈260 and y≈1500 (TikTok/Reels UI safe zone)
 * and left of x≈960 (the right-hand button rail).
 */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  return {
    vertical,
    width,
    height,
    gutter: vertical ? 76 : 110,
    cardW: vertical ? 880 : 720,
    headline: vertical ? 100 : 86,
  };
};

/** 486 → "486", 2140 → "2.1k" */
export const fmt = (n: number) => {
  const v = Math.round(n);
  if (v < 1000) return String(v);
  const k = v / 1000;
  return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`;
};
```

### `src/components/Type.tsx`

```tsx
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

import { BODY, C, DISPLAY, MONO, OPSZ } from '../brand';
import { ease, useT } from './anim';

const clean = (w: string) => w.replace(/[.,!?'’]/g, '');

/**
 * Store-screen headline: Bricolage at its tight display cut. Each word rises out of
 * its own mask. `\n` forces a line break. One word can get the jade marker
 * underline, another can be set in a colour.
 */
export const Display: React.FC<{
  text: string;
  size: number;
  color?: string;
  delay?: number;
  stagger?: number;
  underline?: string;
  underlineColor?: string;
  colorWord?: string;
  colorWordColor?: string;
  lineHeight?: number;
  align?: 'left' | 'center';
  exitAt?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  size,
  color = C.ink,
  delay = 0,
  stagger = 2,
  underline,
  underlineColor = C.jade,
  colorWord,
  colorWordColor = C.green,
  lineHeight = 0.95,
  align = 'left',
  exitAt,
  style,
}) => {
  const frame = useT();
  const lines = text.split('\n');
  const total = text.split(/\s+/).length;
  const exit = exitAt === undefined ? 0 : ease(frame, exitAt, 10);
  let wi = 0;
  return (
    <div
      style={{
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontVariationSettings: `"opsz" ${OPSZ.display}`,
        fontSize: size,
        lineHeight,
        letterSpacing: '-0.052em',
        color,
        opacity: 1 - exit,
        transform: `translateY(${-exit * size * 0.3}px)`,
        ...style,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ display: 'flex', flexWrap: 'wrap', columnGap: '0.2em', justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
          {line.split(' ').map((w) => {
            const i = wi++;
            const p = ease(frame, delay + i * stagger, 16);
            const isU = underline !== undefined && clean(w) === clean(underline);
            const isC = colorWord !== undefined && clean(w) === clean(colorWord);
            const u = ease(frame, delay + total * stagger + 8, 18);
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.16em', marginBottom: '-0.16em', paddingRight: '0.04em', marginRight: '-0.04em' }}>
                  <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 112}%)`, color: isC ? colorWordColor : undefined }}>{w}</span>
                </span>
                {isU ? (
                  <span
                    style={{
                      position: 'absolute',
                      left: '0.02em',
                      right: '0.06em',
                      bottom: '-0.035em',
                      height: '0.085em',
                      borderRadius: 999,
                      background: underlineColor,
                      transform: `scaleX(${u})`,
                      transformOrigin: 'left center',
                    }}
                  />
                ) : null}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** DM Mono label. Uppercase + tracked by default, like the store screens' eyebrows. */
export const Mono: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  upper?: boolean;
  tracking?: number;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, size = 26, color = C.green, upper = true, tracking = 0.14, delay = 0, style }) => {
  const frame = useT();
  const p = ease(frame, delay, 12);
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: size,
        letterSpacing: `${tracking}em`,
        textTransform: upper ? 'uppercase' : 'none',
        color,
        whiteSpace: 'nowrap',
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Body: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  delay?: number;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ children, size = 38, color = C.inkSoft, delay = 0, weight = 400, style }) => {
  const frame = useT();
  const p = ease(frame, delay, 14);
  return (
    <div
      style={{
        fontFamily: BODY,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.3,
        color,
        textWrap: 'balance',
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [14, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
```

### `scripts/vo.py`

```python
"""Gistspot voiceover (free Microsoft neural voice via edge-tts) + the film's timing.

Audio first. Every scene gets ONE paragraph, spoken in one take, so the delivery flows
instead of stopping and starting line by line. Then, for every paragraph, the script:

  1. checks every word in the script was actually spoken (nothing skipped or swallowed),
  2. measures where the sound really starts and ends in the waveform (not TTS metadata),
     so no word is ever clipped at either end,
  3. places it in the film with the same short, natural pause between paragraphs,
  4. sets each scene's length so the picture is on screen exactly while its words are said.

Outputs
  public/audio/vo/voiceover.wav   one continuous narration track, loudness-normalised
  src/vo.json                     where each paragraph and word lands (the film syncs to it)
  src/timing.json                 scene order + lengths, rewritten to fit the voice
  public/audio/music.mp3          music bed cut to the film's new length (from audio-src/)

    python scripts/vo.py            # build all of the above
    python scripts/vo.py --samples  # hear a few voices read the opening (.cache/vo/samples)
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
CACHE = ROOT / '.cache/vo'
TRACK = ROOT / 'public/audio/vo/voiceover.wav'
MANIFEST = ROOT / 'src/vo.json'
TIMING_FILE = ROOT / 'src/timing.json'
MUSIC_SRC = ROOT / 'audio-src/mixkit-158-happy-times.mp3'
MUSIC_OUT = ROOT / 'public/audio/music.mp3'

TIMING = json.loads(TIMING_FILE.read_text(encoding='utf-8'))
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
# Scenes play in this order; the film reads the order from src/timing.json, which this writes.
SCRIPT = [
    ('intro', 8, 200, "Meet Gistspot, the social app for your local community. Talk freely with the people around you, on campus, in your neighbourhood, and across your city."),
    ('hook', 52, 175, "The internet knows everything, except what's happening around you."),
    ('ask', 6, 150, "But your neighbours do. Ask a question, and get real answers from people nearby, in minutes."),
    ('awareness', 6, 180, "Spot something important? Post an Awareness alert, and everyone nearby sees it first."),
    ('speak', 6, 150, "Say what you really think, with a fresh name in every thread."),
    ('polls', 6, 125, "Start a poll, and get live results from your whole area."),
    ('chat', 6, 158, "Want to talk one to one? Chat privately, but only when you both say yes."),
    ('safety', 6, 158, "And the community keeps every conversation respectful."),
    ('places', 4, 120, "From your campus to your street, all across Ghana."),
    ('install', 6, 300, "Gistspot is live now as a web app. Just search Gistspot on Google, and add it to your home screen. It's coming soon to the App Store and Google Play."),
    ('end', 10, 150, "Your community is already talking. Search Gistspot on Google, and join the conversation."),
]


def real(design_frames):
    """Same rounding as realFrames() in src/script.ts (JS Math.round)."""
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


async def make_clip(scene, text):
    mp3, wav, meta = CACHE / f'{scene}.mp3', CACHE / f'{scene}.wav', CACHE / f'{scene}.json'
    key = hashlib.sha1(json.dumps([VOICE, text]).encode()).hexdigest()
    cached = json.loads(meta.read_text(encoding='utf-8')) if meta.exists() else {}
    if cached.get('key') == key and mp3.exists():
        words = [tuple(w) for w in cached['words']]  # same text + voice as last time: reuse the take
    else:
        part = CACHE / f'{scene}.part.mp3'
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


def fit_music(total):
    if not MUSIC_SRC.exists():
        print(f'music: {MUSIC_SRC.name} not found, keeping {MUSIC_OUT.name} as it is')
        return
    dur = total / FPS + 0.5
    li, tp = loudness(MUSIC_SRC, '-t', f'{dur:.3f}')
    gain = min(MUSIC_LUFS - li, MAX_TP - tp)
    ffmpeg('-t', f'{dur:.3f}', '-i', MUSIC_SRC, '-af', f'volume={gain:.2f}dB', '-ar', SR, '-c:a', 'libmp3lame', '-q:a', 2, MUSIC_OUT)
    print(f'music: {dur:.1f}s cut from {MUSIC_SRC.name}, {li:.1f} -> {li + gain:.1f} LUFS')


async def build():
    CACHE.mkdir(parents=True, exist_ok=True)
    TRACK.parent.mkdir(parents=True, exist_ok=True)

    clips = []
    for scene, lead, mn, text in SCRIPT:
        c = await make_clip(scene, text)
        c.update(scene=scene, lead=lead, min=mn, text=text)
        clips.append(c)
        n = len(tokens(text))
        print(f'{scene:<10} {c["s1"] - c["s0"]:5.2f}s  {n:>2} words  {n / (c["s1"] - c["s0"]) * 60:4.0f} wpm  all words spoken')

    rows, total = place(clips)

    # one continuous narration track: one gain for all of it (keeps the take's natural dynamics)
    # plus a gentle peak limiter so it reaches -16 LUFS with clean headroom
    raw = CACHE / 'voiceover-raw.wav'
    vo = assemble(rows, total)
    write_wav(raw, vo)
    li, _ = loudness(raw)
    gain = VO_LUFS - li
    for _ in range(3):
        write_wav(TRACK, limit(vo, gain))
        lo, to = loudness(TRACK)
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

    TIMING['order'] = [r['scene'] for r in rows]
    TIMING['dur'] = dur
    TIMING_FILE.write_text(json.dumps(TIMING, indent=2) + '\n', encoding='utf-8')
    MANIFEST.write_text(json.dumps({'src': 'audio/vo/voiceover.wav', 'frames': total, 'segments': segs}, indent=1) + '\n', encoding='utf-8')

    check = sum(real(dur[k]) for k in TIMING['order']) - T * (len(rows) - 1)
    assert check == total, (check, total)
    print(f'\nfilm: {total} frames ({total / FPS:.1f}s); narration {li + gain:.1f} LUFS')
    print(f'wrote {TRACK.relative_to(ROOT)}, {MANIFEST.relative_to(ROOT)}, {TIMING_FILE.relative_to(ROOT)}')
    fit_music(total)


async def samples():
    out = CACHE / 'samples'
    out.mkdir(parents=True, exist_ok=True)
    line = SCRIPT[0][3]
    for v in ['en-US-AndrewMultilingualNeural', 'en-US-BrianMultilingualNeural', 'en-US-AvaMultilingualNeural', 'en-US-EmmaMultilingualNeural']:
        await synth(line, out / f'{v}.mp3', {'voice': v, 'rate': VOICE['rate'], 'pitch': '+0Hz'})
        print('sample', out / f'{v}.mp3')


if __name__ == '__main__':
    asyncio.run(samples() if '--samples' in sys.argv else build())
```

### `scripts/master.py`

```python
"""Master the finished films' audio for social platforms: -14 LUFS, peaks <= -1 dBTP.

Runs two-pass EBU R128 loudnorm on the soundtrack and copies the video stream untouched.

    python scripts/master.py out/gistspot-pitch-9x16.mp4 out/gistspot-pitch-16x9.mp4
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = 'I=-14:TP=-1:LRA=11'


def ffmpeg(*args):
    return subprocess.run(['npx', 'remotion', 'ffmpeg', *map(str, args)], cwd=ROOT, shell=(sys.platform == 'win32'), capture_output=True, text=True)


def master(path: Path):
    p1 = ffmpeg('-hide_banner', '-y', '-i', path, '-vn', '-af', f'loudnorm={TARGET}:print_format=json', '-f', 'null', '-')
    s = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', p1.stderr).group(0))
    af = (
        f"loudnorm={TARGET}:measured_I={s['input_i']}:measured_TP={s['input_tp']}:measured_LRA={s['input_lra']}"
        f":measured_thresh={s['input_thresh']}:offset={s['target_offset']}:linear=true"
    )
    tmp = path.with_name(path.stem + '.mastering.mp4')
    p2 = ffmpeg('-hide_banner', '-y', '-i', path, '-c:v', 'copy', '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', tmp)
    if p2.returncode != 0:
        raise RuntimeError(p2.stderr[-1200:])
    tmp.replace(path)
    p3 = ffmpeg('-hide_banner', '-i', path, '-vn', '-af', f'loudnorm={TARGET}:print_format=json', '-f', 'null', '-')
    o = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', p3.stderr).group(0))
    print(f"{path.name}: {s['input_i']} LUFS -> {o['input_i']} LUFS, true peak {o['input_tp']} dBTP")


if __name__ == '__main__':
    for f in sys.argv[1:]:
        master(ROOT / f)
```

### `scripts/captions.py`

```python
"""Write an .srt captions file for the film from the narration timings in src/vo.json.

Upload it with the video where the platform allows (YouTube, Facebook, LinkedIn, X), so the film
reads well with the sound off. TikTok and Instagram make their own captions: switch them on there.

    python scripts/captions.py        # -> out/gistspot-pitch.en.srt (same timing for both formats)
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VO = json.loads((ROOT / 'src/vo.json').read_text(encoding='utf-8'))
OUT = ROOT / 'out/gistspot-pitch.en.srt'
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


cues = []
for seg in VO['segments']:
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

OUT.parent.mkdir(exist_ok=True)
OUT.write_text('\n'.join(lines), encoding='utf-8')
print(f'wrote {OUT.relative_to(ROOT)} ({len(cues)} captions)')
```

### `scripts/stills.mjs`

```js
// Usage: node scripts/stills.mjs <compositionId> <outPrefix> <frame> [frame...]
// Bundles once, then renders each frame as a PNG (for reviewing the film quickly).
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';

const [id, prefix, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id });
for (const f of frames) {
  const output = `${prefix}-${f}.png`;
  await renderStill({ composition, serveUrl, frame: Number(f), output, imageFormat: 'png' });
  console.log('wrote', output);
}
```

