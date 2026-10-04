import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import type { MusicQuizPlayerView } from '@party/music-quiz';

export type ClipState = 'idle' | 'loading' | 'ready' | 'playing' | 'ended' | 'error';

/**
 * Plays one round's preview, synchronised to the server clock.
 *
 * The round's `playbackStartAtMs` is an absolute server timestamp, and each
 * client buffers the clip independently, so every client waits for that instant
 * on its own corrected clock rather than playing the moment the file lands. A
 * client that arrives late starts late — there is no attempt to skip ahead,
 * because the excerpt is the same 30 seconds the provider chose.
 */
export function useClipPlayer(view: MusicQuizPlayerView) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const peaksRef = useRef<number[]>([]);
  const [state, setState] = useState<ClipState>('idle');
  const [error, setError] = useState('');
  const [peaks, setPeaks] = useState<number[]>([]);
  const [needsGesture, setNeedsGesture] = useState(false);

  const audio = view.audio;
  const startAt = view.playbackStartAtMs;

  useEffect(() => {
    if (!audio?.providerId || view.phase !== 'ANSWERING') return;

    let live = true;
    const el = new Audio();
    el.preload = 'auto';
    audioRef.current = el;
    setState('loading');
    setError('');
    setNeedsGesture(false);
    setPeaks([]);
    peaksRef.current = [];

    const startTimerRef = { id: null as ReturnType<typeof setTimeout> | null };

    // `serverNow` is a snapshot frozen at the last broadcast, so the skew is
    // captured once here and the wait is timed on the local clock.
    const skew = view.serverNow - Date.now();
    const localAt = (serverMs: number) => serverMs - skew;

    const begin = async () => {
      try {
        await el.play();
        if (!live) return;
        setState('playing');
        setNeedsGesture(false);
      } catch {
        // Autoplay policies block audio until the page has been interacted with.
        if (live) setNeedsGesture(true);
      }
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
          .then((p) => {
            if (live && p.length) {
              peaksRef.current = p;
              setPeaks(p);
            }
          })
          .catch(() => {});

        const delay = localAt(startAt) - Date.now();
        if (delay > 0) startTimerRef.id = setTimeout(begin, delay);
        else await begin();
      } catch (e) {
        if (!live) return;
        setError(e instanceof Error ? e.message : 'The clip could not be loaded.');
        setState('error');
      }
    })();

    el.onended = () => live && setState('ended');
    el.onerror = () => {
      if (!live) return;
      setError('The clip could not be played.');
      setState('error');
    };

    return () => {
      live = false;
      if (startTimerRef.id) clearTimeout(startTimerRef.id);
      el.pause();
      el.src = '';
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio?.provider, audio?.providerId, view.phase, startAt]);

  /** The manual path for a browser that blocked autoplay. */
  const retry = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      el.currentTime = 0;
      await el.play();
      setState('playing');
      setNeedsGesture(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Playback was blocked.');
      setState('error');
    }
  }, []);

  return { state, error, peaks, needsGesture, retry };
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