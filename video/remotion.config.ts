import { Config } from '@remotion/cli/config';

import webpackOverride from './scripts/webpack-override.cjs';

Config.setEntryPoint('src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setCrf(16); // high quality; social platforms re-compress anyway
Config.setOverwriteOutput(true);

// The store's own CSS, icons and helpers, laid out as on a phone (see the file for details).
Config.overrideWebpackConfig(webpackOverride);

// Studio plays at most 5 audio tracks at once by default. The film has narration, music and
// sound effects that overlap (rows popping in a few frames apart), which crashed the preview's
// audio. Rendering is not affected; this only lets the preview play everything.
Config.setNumberOfSharedAudioTags(40);
