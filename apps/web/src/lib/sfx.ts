/**
 * Short sound cues, synthesized rather than shipped.
 *
 * A click is a 40ms sine blip; an mp3 of that would be a larger download than
 * the whole cue is worth, so Web Audio is both smaller and more flexible.
 */
let ctx: AudioContext | null = null;

const audio = () => {
  ctx ??= new AudioContext();
  // Browsers hold the context suspended until a user gesture. The click that
  // triggers the first sound is exactly that gesture.
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

function blip(freq: number, seconds: number, type: OscillatorType, peak: number) {
  const ac = audio();
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  // Ramp to silence rather than stopping flat, which would end on a tick of
  // its own — audible on a fast click.
  amp.gain.setValueAtTime(peak, ac.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + seconds);
  osc.connect(amp).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + seconds);
}

export const sfx = {
  /** A correct number. Pitch rises with the run so progress is audible. */
  click: (step = 0) => blip(760 + Math.min(step, 20) * 20, 0.05, 'sine', 0.12),
  /** Wrong number: low and short, deliberately unlike a correct click. */
  wrong: () => blip(170, 0.13, 'square', 0.06),
  /** Stage cleared: a rising two-note figure. */
  stageClear: () => {
    blip(660, 0.09, 'sine', 0.14);
    setTimeout(() => blip(990, 0.16, 'sine', 0.14), 95);
  },
};
