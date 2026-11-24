// The kit's timing helpers (QUALITY_PLAYBOOK.md section 8), built once per film.
// Scene lengths come from src/films/<film>/timing.json and word timings from
// src/films/<film>/vo.json, both written by scripts/vo.py. Same rounding as vo.py.
import BASE from './timing.json';

export const FPS = BASE.fps;
export const SPEED = BASE.speed;
export const TRANSITION = BASE.transition;

/** Real (30 fps) frame counts after SPEED. */
export const realFrames = (designFrames: number) => Math.round(designFrames / SPEED);
export const REAL_TRANSITION = realFrames(TRANSITION);

export type VoWord = { w: string; f: number; e: number };
export type VoSegment = { scene: string; text: string; from: number; to: number; words: VoWord[] };
export type VoManifest = { src: string; frames: number; segments: VoSegment[] };

export function makeTimeline<K extends string>(timing: { order: string[]; dur: Record<K, number> }, vo: VoManifest) {
  const DUR = timing.dur;
  const ORDER = timing.order as K[];
  const TOTAL = ORDER.reduce((a, k) => a + realFrames(DUR[k]), 0) - REAL_TRANSITION * (ORDER.length - 1);

  /** Real frame at which a scene starts in the finished film. */
  const startOf = (key: K) => {
    let t = 0;
    for (const k of ORDER) {
      if (k === key) return t;
      t += realFrames(DUR[k]) - REAL_TRANSITION;
    }
    return t;
  };

  /** Real frame of a moment `designFrame` into a scene. */
  const at = (key: K, designFrame: number) => startOf(key) + realFrames(designFrame);

  /**
   * Design frame inside `scene` where the narrator starts saying `word` (its `nth` time there),
   * read from vo.json. Key moments use this so the picture lands on the voice, and stays
   * in sync after the script is re-voiced. If the word is no longer in that scene's line,
   * `fallback` is used.
   */
  const cue = (scene: K, word: string, fallback: number, nth = 1) => {
    const seg = vo.segments.find((s) => s.scene === scene);
    const hit = seg?.words.filter((w) => w.w === word)[nth - 1];
    return hit ? Math.round((hit.f - startOf(scene)) * SPEED) : fallback;
  };

  /** Design frame where the scene's narration ends. */
  const voiceEnd = (scene: K, fallback: number) => {
    const seg = vo.segments.find((s) => s.scene === scene);
    return seg ? Math.round((seg.to - startOf(scene)) * SPEED) : fallback;
  };

  return { DUR, ORDER, TOTAL, startOf, at, cue, voiceEnd, VO: vo };
}

export type Timeline<K extends string> = ReturnType<typeof makeTimeline<K>>;
