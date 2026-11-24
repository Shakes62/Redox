import React from 'react';
import { Composition } from 'remotion';

import './brand';
import { RedoxFilm, REDOX_TOTAL } from './FilmRedox';
import { Measure } from './Measure';
import { Screens } from './Screens';
import { FPS } from './timeline';

export const Root: React.FC = () => (
  <>
    {/* The range, then how to order. 9:16 for TikTok, Reels, Shorts, WhatsApp Status; 16:9 for YouTube and the website */}
    <Composition id="Redox-Vertical" component={RedoxFilm} durationInFrames={REDOX_TOTAL} fps={FPS} width={1080} height={1920} />
    <Composition id="Redox-Wide" component={RedoxFilm} durationInFrames={REDOX_TOTAL} fps={90} width={1920} height={1080} />
    {/* Review sheet of every store screen used in the film (stills only) */}
    <Composition id="Measure" component={Measure} durationInFrames={1} fps={FPS} width={1950} height={1700} />
    <Composition id="Screens" component={Screens} durationInFrames={1} fps={FPS} width={2500} height={2120} />
  </>
);
