// The kit's Film.tsx (from the Plugg and Gistspot films). The audio half is exactly the Gistspot one:
// ONE narration track and the ducked music at the top level, outside TransitionSeries,
// sound effects in their own Sequences timed in real frames. Scenes hold picture only.
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from 'remotion';

import { C, EASE_INOUT } from './brand';
import { AUDIO } from './script';
import { REAL_TRANSITION, realFrames, type Timeline } from './timeline';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export type Cue = { f: number; s: 'pop' | 'tap' | 'type' | 'whoosh'; v: number; len?: number; trim?: number };

/* ---------------- Music: ducked under the narration ---------------- */
const MUSIC_OPEN = 0.62; // when nobody is speaking
const MUSIC_UNDER = 0.28; // under the voice (~-7 dB), so every word stays clear on a phone speaker

const makeDuck = (vo: Timeline<string>['VO'], total: number) => {
  // Speech, merged across the short pauses between paragraphs so the music doesn't pump up and down.
  const speech = vo.segments.reduce<[number, number][]>((out, s) => {
    const last = out[out.length - 1];
    if (last && s.from - last[1] < 30) last[1] = s.to;
    else out.push([s.from, s.to]);
    return out;
  }, []);
  const a = new Float32Array(total + 1);
  for (const [from, to] of speech) {
    for (let f = Math.floor(from - 8); f <= Math.ceil(to + 16); f++) {
      if (f < 0 || f > total) continue;
      const rise = interpolate(f, [from - 8, from - 1], [0, 1], clamp);
      const fall = interpolate(f, [to + 2, to + 16], [1, 0], clamp);
      a[f] = Math.max(a[f], Math.min(rise, fall));
    }
  }
  return a;
};

export function makeFilm<K extends string>(film: string, tl: Timeline<K>, scenes: Record<K, React.FC>, cues: Cue[]) {
  const { ORDER, DUR, TOTAL, startOf, VO } = tl;
  // page swipes between scenes
  const allCues: Cue[] = [...ORDER.slice(1).map((k): Cue => ({ f: startOf(k), s: 'whoosh', v: 0.28 })), ...cues];
  const duckCurve = makeDuck(VO, TOTAL);

  const Film: React.FC = () => {
    const children: React.ReactNode[] = [];
    ORDER.forEach((k, i) => {
      if (i > 0) {
        children.push(
          <TransitionSeries.Transition key={`t-${k}`} presentation={slide({ direction: 'from-right' })} timing={linearTiming({ durationInFrames: REAL_TRANSITION, easing: EASE_INOUT })} />,
        );
      }
      const Scene = scenes[k] as React.FC;
      children.push(
        <TransitionSeries.Sequence key={k} durationInFrames={realFrames(DUR[k])} name={k}>
          <Scene />
        </TransitionSeries.Sequence>,
      );
    });

    return (
      <AbsoluteFill style={{ background: C.bg }}>
        <TransitionSeries>{children}</TransitionSeries>

        {AUDIO.music ? (
          <Audio
            src={staticFile(`audio/${film}/music.mp3`)}
            volume={(f) => {
              const duck = AUDIO.vo ? duckCurve[Math.min(TOTAL, Math.max(0, f))] : 0;
              const level = MUSIC_OPEN - (MUSIC_OPEN - MUSIC_UNDER) * duck;
              const fade = interpolate(f, [0, 4, TOTAL - 40, TOTAL], [0, 1, 1, 0], clamp);
              return level * fade * (AUDIO.musicVolume / 0.32);
            }}
          />
        ) : null}

        {/* the narration: one continuous, pre-timed track (scripts/vo.py) */}
        {AUDIO.vo ? <Audio src={staticFile(VO.src)} name="narration" /> : null}

        {AUDIO.sfx
          ? allCues.map((c, i) => {
              const len = c.len ?? 40;
              return (
                <Sequence key={`s${i}`} from={c.f} durationInFrames={len} layout="none" name={`sfx ${c.s}`}>
                  <Audio src={staticFile(`audio/sfx/${c.s}.mp3`)} trimBefore={c.trim} volume={(f) => c.v * interpolate(f, [0, 2, len - 4, len], [0, 1, 1, 0], clamp)} />
                </Sequence>
              );
            })
          : null}
      </AbsoluteFill>
    );
  };
  return { Film, TOTAL };
}

/** Typing sound for `chars` characters at `cps` per design frame, so it stops when the text stops. */
// At least 8 frames so the 2-frame fade in and 4-frame fade out never overlap.
export const typingCue = (f: number, chars: number, cps: number, trim: number, v = 0.42): Cue => ({ f, s: 'type', v, len: Math.max(8, realFrames(chars / cps + 2)), trim });
