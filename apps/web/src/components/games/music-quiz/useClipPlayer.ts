import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import type { MusicQuizPlayerView } from '@party/music-quiz';

export type ClipState = 'idle' | 'loading' | 'ready' | 'playing' | 'ended' | 'error';

const VOLUME_KEY = 'music-quiz-volume';

/**
 * How loud this browser wants its music. Local only and never sent to the
 * server: it is a listening preference, not game state, so it has no business
 * in the authoritative view. Persisted because a player who turns it down once
 * should not have to do it again every room.
 */
function loadVolume(): number {
  const stored = localStorage.getItem(VOLUME_KEY);
  // `Number(null)` is 0 and would sail past isFinite, silently muting a first
  // visit — so an absent key has to be told apart from a stored zero.
  if (stored === null) return 0.8;
  const raw = Number(stored);
  return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.8;
}

/**
 * Plays one round's preview, synchronised to the server clock.
 *
 * Three things the naive version got wrong, and this file is mostly about them:
 *
 * 1. **The clip autoplays, with a tap-to-play fallback.** Reaching a room takes
 *    several taps, so the autoplay policy normally lets the clip start by itself
 *    and the tap-to-play button never appears. Where it does not, a rejected
 *    play() is a "tap to play" situation rather than a broken clip, so the
 *    button comes back instead of an error. The shared answer deadline runs from
 *    the server's clock regardless, so either path costs the player nothing and
 *    cannot be gamed either.
 *
 * 2. **The clip outlives the ANSWERING phase.** The effect is keyed on the
 *    round, not the phase, so opening the reveal does not tear the element down —
 *    the music carries on from where it is and stops at `revealEndsAtMs`. It is
 *    never restarted or seeked during the reveal.
 *
 * 3. **Repeated taps cannot stack.** The play path is a single in-flight
 *    promise; a second tap while the first is resolving is a no-op.
 */
export function useClipPlayer(view: MusicQuizPlayerView) {
  // One element for the whole session, not one per round. Autoplay permission is
  // tracked per element: a fresh `new Audio()` starts with no permission and has
  // to earn it again, which on stricter browsers means only the first round plays
  // by itself. Reusing the element keeps the permission the first play won.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Which round the element is currently loaded with — the staleness token. */
  const loadedRoundRef = useRef<number | null>(null);
  const playingRef = useRef<Promise<void> | null>(null);
  const liveRef = useRef(true);
  /** Server-minus-local, recaptured on every broadcast like the countdown. */
  const skewRef = useRef(0);
  const [state, setState] = useState<ClipState>('idle');
  const [error, setError] = useState('');
  const [peaks, setPeaks] = useState<number[]>([]);
  /** True until the clip is actually playing — this is the TAP TO PLAY button. */
  const [needsGesture, setNeedsGesture] = useState(false);
  const [volume, setVolumeState] = useState(loadVolume);
  // The round effect is keyed on the round, not the volume, so it would capture
  // a stale level; the ref is what each fresh element is created with.
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const setVolume = useCallback((v: number) => {
    volumeRef.current = v;
    setVolumeState(v);
    localStorage.setItem(VOLUME_KEY, String(v));
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const audio = view.audio;
  const startAt = view.playbackStartAtMs;
  const roundNumber = view.roundNumber;

  useEffect(() => {
    skewRef.current = view.serverNow - Date.now();
  }, [view.serverNow]);

  // Keyed on the round only. Including `phase` here is what used to stop the
  // music the instant the reveal opened.
  useEffect(() => {
    if (!audio?.providerId) return;

    let live = true;
    liveRef.current = true;
    const el = audioRef.current ?? new Audio();
    el.preload = 'auto';
    audioRef.current = el;
    loadedRoundRef.current = roundNumber;
    el.volume = volumeRef.current;
    el.pause();
    el.removeAttribute('src');
    el.load();
    setState('loading');
    setError('');
    setNeedsGesture(true);
    setPeaks([]);

    el.onended = () => live && setState('ended');
    el.onerror = () => {
      if (!live) return;
      setError('The clip could not be played.');
      setState('error');
    };

    (async () => {
      try {
        const res = await api.get<{ url: string }>(
          `/api/music-quiz/preview?provider=${audio.provider}&providerId=${encodeURIComponent(audio.providerId)}`
        );
        if (!live) return;
        el.src = res.url;

        // The waveform is decoded from the same fetch the browser is already
        // making, so it adds no second download. A failed decode is cosmetic:
        // the audio still plays.
        el.crossOrigin = 'anonymous';
        void drawPeaks(el)
          .then((p) => live && p.length && setPeaks(p))
          .catch(() => {});

        setState('ready');
      } catch (e) {
        if (!live) return;
        setError(e instanceof Error ? e.message : 'The clip could not be loaded.');
        setState('error');
      }
    })();

    return () => {
      live = false;
      liveRef.current = false;
      playingRef.current = null;
    };
  }, [audio?.provider, audio?.providerId, roundNumber, startAt]);

  /**
   * Starts the clip. `fromStart` is the replay button; the first play waits for
   * the round's scheduled instant so a room is in sync, and never seeks.
   */
  const play = useCallback(async (fromStart = false) => {
    const el = audioRef.current;
    if (!el || !el.src) return;
    // A second tap while the first is still resolving must not queue a second
    // play() — browsers reject it anyway, and it reads as a broken button.
    if (playingRef.current) return playingRef.current;

    const task = (async () => {
      if (!fromStart) {
        const delay = startAt - skewRef.current - Date.now();
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      }
      if (fromStart && el.src) el.currentTime = 0;
      try {
        await el.play();
        if (!liveRef.current) return;
        setState('playing');
        setNeedsGesture(false);
      } catch (e) {
        if (!liveRef.current) return;
        // A blocked autoplay is not a broken clip — the round opens with the
        // tap-to-play button instead, which is a click the browser accepts.
        if (e instanceof DOMException && e.name === 'NotAllowedError') {
          setState('ready');
          setNeedsGesture(true);
          return;
        }
        setError(e instanceof Error ? e.message : 'Playback was blocked.');
        setState('error');
      }
    })();

    playingRef.current = task;
    await task;
    playingRef.current = null;
  }, [startAt]);

  /**
   * Start the clip as soon as its url is known. `ready` is left in place when
   * the browser refuses, so this does not re-run and cannot loop; the fallback
   * is the button, not another attempt.
   */
  useEffect(() => {
    if (state === 'ready') void play();
  }, [state, play]);

  /**
   * The reveal's own job: let the clip run on and stop it at the instant the
   * server stamped. Not a second timer per player — one timestamp, one stop.
   *
   * `serverNow` is read through a ref rather than listed as a dependency on
   * purpose. It changes on every broadcast, and a re-run here would clear the
   * pending stop before it fired — the round-end broadcast lands on the same
   * instant as the stop, so the clip ran on into the next question.
   */
  const serverNowRef = useRef(view.serverNow);
  serverNowRef.current = view.serverNow;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    // The round this stop belongs to. The element is reused across rounds, so
    // identity no longer tells a stale timer from a live one.
    const stopRound = loadedRoundRef.current;

    const stopAt =
      view.phase === 'REVEAL' ? view.revealEndsAtMs : view.phase === 'GAME_OVER' ? serverNowRef.current : null;
    if (stopAt == null) return;

    setTimeout(() => {
      if (loadedRoundRef.current !== stopRound) return; // the next round already owns the element
      el.pause();
      setState('ended');
    }, Math.max(0, stopAt - skewRef.current - Date.now()));
    // Deliberately not cleared on cleanup. The round-end broadcast arrives at
    // the same instant as this stop, so a cleanup here cancelled the pause and
    // let the clip run on into the next question. A stray timer that finds the
    // element already replaced returns on the guard above.
  }, [view.phase, view.revealEndsAtMs]);

  return { state, error, peaks, needsGesture, play, volume, setVolume, retry: () => play(true) };
}

/** Amplitude only — the bars carry no title, artist or album art, so the
 *  waveform cannot leak the answer the clip is the question about. */
async function drawPeaks(el: HTMLAudioElement, bars = 56): Promise<number[]> {
  const res = await fetch(el.src);
  const buf = await res.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(buf);
    const data = audio.getChannelData(0);
    const per = Math.max(1, Math.floor(data.length / bars));
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
      let peak = 0;
      const from = i * per;
      for (let j = from; j < from + per && j < data.length; j += 64) {
        const v = Math.abs(data[j]!);
        if (v > peak) peak = v;
      }
      out.push(peak);
    }
    const max = Math.max(...out, 0.01);
    return out.map((v) => Math.max(0.06, v / max));
  } finally {
    void ctx.close();
  }
}