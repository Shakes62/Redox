// Timing for the REDOXDESIGNX film: scene lengths and word cues written by scripts/vo.py.
import { makeTimeline } from '../../timeline';
import TIMING from './timing.json';
import VO from './vo.json';

export type SceneKey = keyof typeof TIMING.dur;
export const TL = makeTimeline<SceneKey>(TIMING, VO);
export const { DUR, ORDER, TOTAL, startOf, at, cue, voiceEnd } = TL;
