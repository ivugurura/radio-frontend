import React from 'react';

export type RadioStreamStatus =
  | 'idle'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'error';

type NowResponse = {
  data?: {
    current?: string;
    next?: string;
  };
};

type StatusResponse = {
  data?: {
    is_live?: boolean;
  };
};

type UseRadioStreamParams = {
  streamUrl: string;
  /** When provided, polls for current/next track metadata. */
  nowUrl?: string;
  /** When provided, polls for live/AutoDJ status. */
  statusUrl?: string;
  autoPlay?: boolean;
  pollIntervalMs?: number;
};

type UseRadioStreamResult = {
  status: RadioStreamStatus;
  isPlaying: boolean;
  isBuffering: boolean;
  errorMessage: string;
  volume: number;
  muted: boolean;
  isLive: boolean;
  currentTrack: string;
  nextTrack: string;
  elapsedSec: number;
  metadataError: string;
  togglePlayback: () => void;
  reconnect: () => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  /** Re-polls now-playing/status right away, e.g. after a skip. */
  refreshMetadata: () => void;
};

const cleanTrackName = (value?: string) =>
  value ? value.replace(/\.[a-zA-Z0-9]+$/, '') : '';

// The Go server sends a raw, container-less MP3 stream. Handed straight to a
// plain <audio src=...>, browsers' built-in decoders (Chrome/Firefox) buffer
// several seconds of it before firing "playing" — much more than a dedicated
// client like VLC needs on the exact same bytes. Feeding the stream through
// MediaSource ourselves lets us start playback as soon as the first small
// chunk is decodable, instead of waiting on the browser's own heuristics.
const STREAM_MIME = 'audio/mpeg';
// Trim buffered audio behind the playhead so an hours-long session doesn't
// grow SourceBuffer memory unbounded; the stream is live/unseekable so old
// data has no value once played.
const BUFFER_KEEP_BEHIND_SECONDS = 30;

function supportsMseStream(): boolean {
  return (
    typeof window !== 'undefined' &&
    'MediaSource' in window &&
    MediaSource.isTypeSupported(STREAM_MIME)
  );
}

function appendBufferAsync(
  sourceBuffer: SourceBuffer,
  chunk: Uint8Array<ArrayBuffer>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onUpdateEnd = () => {
      sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      sourceBuffer.removeEventListener('error', onError);
      resolve();
    };
    const onError = () => {
      sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      sourceBuffer.removeEventListener('error', onError);
      reject(new Error('SourceBuffer append failed'));
    };
    sourceBuffer.addEventListener('updateend', onUpdateEnd);
    sourceBuffer.addEventListener('error', onError);
    try {
      sourceBuffer.appendBuffer(chunk);
    } catch (err) {
      sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      sourceBuffer.removeEventListener('error', onError);
      reject(err);
    }
  });
}

function removeRangeAsync(
  sourceBuffer: SourceBuffer,
  start: number,
  end: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onUpdateEnd = () => {
      sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      sourceBuffer.removeEventListener('error', onError);
      resolve();
    };
    const onError = () => {
      sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      sourceBuffer.removeEventListener('error', onError);
      reject(new Error('SourceBuffer remove failed'));
    };
    sourceBuffer.addEventListener('updateend', onUpdateEnd);
    sourceBuffer.addEventListener('error', onError);
    try {
      sourceBuffer.remove(start, end);
    } catch (err) {
      sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      sourceBuffer.removeEventListener('error', onError);
      reject(err);
    }
  });
}

async function trimBuffered(
  sourceBuffer: SourceBuffer,
  audio: HTMLAudioElement,
) {
  if (sourceBuffer.updating) return;
  const buffered = sourceBuffer.buffered;
  if (buffered.length === 0) return;
  const removeEnd = audio.currentTime - BUFFER_KEEP_BEHIND_SECONDS;
  const start = buffered.start(0);
  if (removeEnd > start + 1) {
    try {
      await removeRangeAsync(sourceBuffer, start, removeEnd);
    } catch {
      // Non-fatal: buffer just keeps growing until the next successful trim.
    }
  }
}

// Opens a MediaSource on `audio`, pumps the live stream into it chunk by
// chunk, and resolves once the first chunk is appended (enough to call
// play() without an immediate "waiting" stall). Keeps pumping in the
// background until `signal` aborts or the connection ends/errors.
function startMseStream(
  audio: HTMLAudioElement,
  streamUrl: string,
  signal: AbortSignal,
  onError: () => void,
): Promise<void> {
  return new Promise((resolveFirstChunk, rejectFirstChunk) => {
    const mediaSource = new MediaSource();
    const objectUrl = URL.createObjectURL(mediaSource);
    audio.src = objectUrl;

    let settled = false;
    const fail = (err: unknown) => {
      if (!settled) {
        settled = true;
        rejectFirstChunk(err);
      } else {
        onError();
      }
    };

    mediaSource.addEventListener(
      'sourceopen',
      () => {
        URL.revokeObjectURL(objectUrl);
        if (signal.aborted) return;

        let sourceBuffer: SourceBuffer;
        try {
          sourceBuffer = mediaSource.addSourceBuffer(STREAM_MIME);
        } catch (err) {
          fail(err);
          return;
        }

        (async () => {
          try {
            const response = await fetch(streamUrl, { signal });
            if (!response.ok || !response.body) {
              throw new Error(`stream fetch failed: ${response.status}`);
            }
            const reader = response.body.getReader();
            let firstChunk = true;

            while (true) {
              const { done, value } = await reader.read();
              if (signal.aborted) {
                await reader.cancel().catch(() => {});
                return;
              }
              if (done) break;
              if (!value || value.byteLength === 0) continue;

              // fetch()'s ReadableStream<Uint8Array> may be backed by a
              // SharedArrayBuffer-typed buffer; appendBuffer requires a
              // plain ArrayBuffer, so copy into one.
              await appendBufferAsync(sourceBuffer, new Uint8Array(value));
              await trimBuffered(sourceBuffer, audio);

              if (firstChunk) {
                firstChunk = false;
                if (!settled) {
                  settled = true;
                  resolveFirstChunk();
                }
              }
            }

            if (!signal.aborted && mediaSource.readyState === 'open') {
              mediaSource.endOfStream();
            }
            if (!settled) {
              fail(new Error('stream ended before first chunk'));
            } else {
              onError();
            }
          } catch (err) {
            if (signal.aborted) return;
            fail(err);
          }
        })();
      },
      { once: true },
    );

    mediaSource.addEventListener('error', () =>
      fail(new Error('MediaSource error')),
    );
  });
}

export function useRadioStream({
  streamUrl,
  nowUrl,
  statusUrl,
  autoPlay = false,
  pollIntervalMs = 5000,
}: UseRadioStreamParams): UseRadioStreamResult {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  // Tracks user intent (as opposed to `status`, which reflects the live
  // connection) so a network drop/reconnect can resume playback without the
  // user having pressed play again.
  const shouldBePlayingRef = React.useRef(false);
  const [status, setStatus] = React.useState<RadioStreamStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [volumeState, setVolumeState] = React.useState(0.85);
  const [muted, setMuted] = React.useState(false);

  const [isLive, setIsLive] = React.useState(false);
  const [currentTrack, setCurrentTrack] = React.useState('');
  const [nextTrack, setNextTrack] = React.useState('');
  const [elapsedSec, setElapsedSec] = React.useState(0);
  const [metadataError, setMetadataError] = React.useState('');
  const [metadataNonce, setMetadataNonce] = React.useState(0);

  const isPlaying = status === 'playing';
  const isBuffering = status === 'buffering';

  const teardownStream = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  React.useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';
    audio.volume = volumeState;
    audio.muted = muted;

    const onPlaying = () => setStatus('playing');
    const onPause = () =>
      setStatus((prev) => (prev === 'error' ? prev : 'paused'));
    const onError = () => {
      setErrorMessage('Failed to play stream');
      setStatus('error');
    };
    const onWaiting = () => {
      if (!audio.paused) setStatus('buffering');
    };
    const onStalled = () => {
      if (!audio.paused) setStatus('buffering');
    };

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('stalled', onStalled);

    return () => {
      teardownStream();
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('stalled', onStalled);
      audioRef.current = null;
    };
  }, [streamUrl, teardownStream]);

  React.useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volumeState;
  }, [volumeState]);

  React.useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const play = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    shouldBePlayingRef.current = true;
    setErrorMessage('');
    setStatus('buffering');
    // Always (re)connect fresh rather than resuming a stale buffer — this is
    // a live stream, not seekable media.
    teardownStream();

    if (supportsMseStream()) {
      const controller = new AbortController();
      abortRef.current = controller;
      const onStreamEnded = () => {
        if (abortRef.current === controller) {
          setErrorMessage('Stream disconnected');
          setStatus('error');
        }
      };
      startMseStream(audio, streamUrl, controller.signal, onStreamEnded)
        .then(() => {
          if (controller.signal.aborted) return;
          audio.play().catch(() => {
            if (!controller.signal.aborted) setStatus('idle');
          });
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          // Fall back to letting the browser handle the raw stream directly.
          audio.src = streamUrl;
          audio.play().catch(() => setStatus('idle'));
        });
    } else {
      audio.src = streamUrl;
      audio.play().catch(() => setStatus('idle'));
    }
  }, [streamUrl, teardownStream]);

  const stop = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    shouldBePlayingRef.current = false;
    teardownStream();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setStatus('idle');
  }, [teardownStream]);

  const togglePlayback = React.useCallback(() => {
    if (isPlaying || isBuffering) {
      stop();
    } else {
      play();
    }
  }, [isPlaying, isBuffering, play, stop]);

  React.useEffect(() => {
    if (autoPlay) play();
  }, [autoPlay, streamUrl, play]);

  // A live MSE fetch doesn't recover on its own from a network change (Wi-Fi
  // <-> cellular handoff, brief drop/reconnect, etc.) — it just stalls or
  // errors out. If the user still wants playback, re-buffer and resume as
  // soon as the network is back, instead of leaving it stuck.
  React.useEffect(() => {
    const handleOffline = () => {
      if (shouldBePlayingRef.current) setStatus('buffering');
    };
    const handleNetworkRestored = () => {
      if (shouldBePlayingRef.current) play();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleNetworkRestored);

    // Network Information API: fires on network type changes (e.g. wifi ->
    // cellular) that may not trigger 'offline'/'online' but still break the
    // in-flight stream connection. Not supported everywhere, so best-effort.
    const connection = (navigator as Navigator & { connection?: EventTarget })
      .connection;
    connection?.addEventListener('change', handleNetworkRestored);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleNetworkRestored);
      connection?.removeEventListener('change', handleNetworkRestored);
    };
  }, [play]);

  const setVolume = React.useCallback((value: number) => {
    setMuted(false);
    setVolumeState(Math.max(0, Math.min(1, value)));
  }, []);

  const toggleMute = React.useCallback(() => setMuted((m) => !m), []);

  React.useEffect(() => {
    if (!nowUrl && !statusUrl) return undefined;
    let isMounted = true;

    const fetchNow = async () => {
      if (!nowUrl) return;
      try {
        const response = await fetch(nowUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error('metadata fetch failed');
        const payload = (await response.json()) as NowResponse;
        if (!isMounted) return;
        setCurrentTrack(cleanTrackName(payload?.data?.current));
        setNextTrack(cleanTrackName(payload?.data?.next));
        setMetadataError('');
      } catch {
        if (isMounted) setMetadataError('Unable to load current/next metadata');
      }
    };

    const fetchStatus = async () => {
      if (!statusUrl) return;
      try {
        const response = await fetch(statusUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error('status fetch failed');
        const payload = (await response.json()) as StatusResponse;
        if (!isMounted) return;
        setIsLive(Boolean(payload?.data?.is_live));
      } catch {
        // Leave the last known live status in place on a transient failure.
      }
    };

    fetchNow();
    fetchStatus();
    const timer = window.setInterval(() => {
      fetchNow();
      fetchStatus();
    }, pollIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [nowUrl, statusUrl, pollIntervalMs, metadataNonce]);

  const refreshMetadata = React.useCallback(
    () => setMetadataNonce((n) => n + 1),
    [],
  );

  React.useEffect(() => {
    if (!currentTrack) {
      setElapsedSec(0);
      return undefined;
    }
    if (!isPlaying) return undefined;
    const timer = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, currentTrack]);

  return {
    status,
    isPlaying,
    isBuffering,
    errorMessage,
    volume: volumeState,
    muted,
    isLive,
    currentTrack,
    nextTrack,
    elapsedSec,
    metadataError,
    togglePlayback,
    reconnect: play,
    setVolume,
    toggleMute,
    refreshMetadata,
  };
}
