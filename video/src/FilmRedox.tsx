// The REDOXDESIGNX film: the scenes in order and their sound effects. Every cue frame comes from
// the scene's own timing constants (src/scenes/redox.tsx), never typed in by hand.
import { makeFilm, typingCue, type Cue } from './FilmShell';
import { at, TL } from './films/redox/timeline';
import * as S from './scenes/redox';
import { FILM, STORY } from './script';

const SCENES = {
  intro: S.Intro,
  weights: S.Weights,
  range: S.Range,
  quality: S.Quality,
  howto: S.HowTo,
  colour: S.Colour,
  size: S.Sizes,
  details: S.Details,
  delivery: S.Delivery,
  pay: S.Pay,
  placed: S.Placed,
  ship: S.Ship,
  trust: S.Trust,
  end: S.End,
};

const pop = (f: number, v = 0.26): Cue => ({ f, s: 'pop', v });
const tap = (f: number, v = 0.45): Cue => ({ f, s: 'tap', v });

const CUES: Cue[] = [
  // the icon builds, the name rises, the icon glides into the corner, the hero lands
  pop(at('intro', 1), 0.3),
  { f: at('intro', S.INTRO_T.glide), s: 'whoosh', v: 0.16 },
  pop(at('intro', S.INTRO_T.stage), 0.24),
  ...S.INTRO_T.changes.map((f) => tap(at('intro', f), 0.14)),
  pop(at('intro', S.INTRO_T.pill), 0.22),
  // weight rows, the lightest and the heaviest light up
  ...S.WEIGHTS_T.rows.map((f) => pop(at('weights', f), 0.12)),
  pop(at('weights', S.WEIGHTS_T.low), 0.24),
  pop(at('weights', S.WEIGHTS_T.high), 0.26),
  { f: at('weights', S.WEIGHTS_T.legend), s: 'whoosh', v: 0.12 },
  // the range: one tile per type, the summer tee, nineteen caps
  pop(at('range', S.RANGE_T.tees), 0.22),
  pop(at('range', S.RANGE_T.raglans), 0.22),
  pop(at('range', S.RANGE_T.long), 0.22),
  pop(at('range', S.RANGE_T.summer), 0.2),
  pop(at('range', S.RANGE_T.caps), 0.22),
  pop(at('range', S.RANGE_T.nineteen), 0.26),
  // the facts, the bulk price unlocks, the print card
  ...S.QUALITY_T.facts.map((f) => pop(at('quality', f), 0.18)),
  pop(at('quality', S.QUALITY_T.bulk), 0.22),
  pop(at('quality', S.QUALITY_T.fill), 0.3),
  { f: at('quality', S.QUALITY_T.print), s: 'whoosh', v: 0.18 },
  // how to order: the three steps
  ...S.HOWTO_T.steps.map((f) => pop(at('howto', f), 0.22)),
  // open the shirt, tap a colour
  tap(at('colour', S.COLOUR_T.open)),
  { f: at('colour', S.COLOUR_T.open + 6), s: 'whoosh', v: 0.14 },
  tap(at('colour', S.COLOUR_T.tap)),
  // sizes, colours, the total, buy now
  ...S.SIZE_T.taps.map((f) => tap(at('size', f), 0.4)),
  pop(at('size', S.SIZE_T.total + 6), 0.22),
  tap(at('size', S.SIZE_T.buy)),
  { f: at('size', S.SIZE_T.buy + 6), s: 'whoosh', v: 0.14 },
  // details typed
  pop(at('details', S.DETAILS_T.steps), 0.2),
  typingCue(at('details', S.DETAILS_T.name), STORY.buyer.name.length, S.DETAILS_T.cps[0], 6, 0.38),
  typingCue(at('details', S.DETAILS_T.phone), STORY.buyer.phone.length, S.DETAILS_T.cps[1], 45, 0.38),
  pop(at('details', S.DETAILS_T.sms), 0.22),
  typingCue(at('details', S.DETAILS_T.email), STORY.buyer.email.length, S.DETAILS_T.cps[2], 90, 0.38),
  tap(at('details', S.DETAILS_T.go)),
  // delivery: search, places, pick, price, address
  tap(at('delivery', S.DELIVERY_T.search), 0.36),
  typingCue(at('delivery', S.DELIVERY_T.type), STORY.search.length, 0.45, 20, 0.38),
  pop(at('delivery', S.DELIVERY_T.places), 0.24),
  tap(at('delivery', S.DELIVERY_T.pick)),
  pop(at('delivery', S.DELIVERY_T.price), 0.22),
  typingCue(at('delivery', S.DELIVERY_T.addr + 4), STORY.address.length, 1.5, 60, 0.36),
  tap(at('delivery', S.DELIVERY_T.go)),
  // pay
  tap(at('pay', S.PAY_T.tap)),
  { f: at('pay', S.PAY_T.sheet), s: 'whoosh', v: 0.16 },
  ...S.PAY_T.options.map((f) => pop(at('pay', f), 0.2)),
  pop(at('pay', S.PAY_T.pin), 0.26),
  // order placed, the SMS
  pop(at('placed', S.PLACED_T.done), 0.34),
  pop(at('placed', S.PLACED_T.ref), 0.2),
  pop(at('placed', S.PLACED_T.sms + 4), 0.36),
  // packing, shipped SMS, the call, today or tomorrow, tracking
  pop(at('ship', S.SHIP_T.pack), 0.22),
  pop(at('ship', S.SHIP_T.ship), 0.24),
  pop(at('ship', S.SHIP_T.sms), 0.34),
  pop(at('ship', S.SHIP_T.call), 0.26),
  pop(at('ship', S.SHIP_T.day), 0.28),
  tap(at('ship', S.SHIP_T.tap)),
  // why REDOX
  ...S.TRUST_T.cards.map((f) => pop(at('trust', f), 0.22)),
  // the end card: the address typed into the search box, then sent
  pop(at('end', 2), 0.24),
  typingCue(at('end', S.END_T.type), S.END_T.chars, S.END_T.cps, 30, 0.42),
  tap(at('end', S.END_T.go), 0.4),
  pop(at('end', S.END_T.go + 14), 0.22),
];

// Keep the import used even if the end copy changes.
void FILM;

export const { Film: RedoxFilm, TOTAL: REDOX_TOTAL } = makeFilm('redox', TL, SCENES, CUES);
