import React from 'react';
import { useApolloClient } from '@apollo/client/react';
import { STUDIO_URL } from '@libs/constants';
import { getOrCreateListenerClientId } from '@libs/chat';
import { useStudioId } from '@components/providers';

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
  /** Shown on lock-screen / notification media controls. */
  stationName?: string;
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

// Automatic reconnects back off exponentially between these bounds.
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
// Buffering with no playback progress for this long counts as a dead
// connection, even if the socket never reported an error.
const STALL_TIMEOUT_MS = 15000;
const STALL_CHECK_INTERVAL_MS = 5000;
// At most one "which studios are on air?" refetch per this interval when the
// studio's status endpoint answers 404.
const STUDIO_REFETCH_MIN_INTERVAL_MS = 30000;

const MEDIA_SESSION_ARTWORK: MediaImage[] = [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
];

function supportsMseStream(): boolean {
  return (
    typeof window !== 'undefined' &&
    'MediaSource' in window &&
    MediaSource.isTypeSupported(STREAM_MIME)
  );
}

// The MSE path is pumped by page JavaScript, which mobile OSes freeze or
// throttle once the screen turns off (Android Doze, OEM battery savers,
// background-tab freezing), so playback dies when the buffer runs dry. A plain
// <audio src> is fetched by the browser's media stack and keeps going in the
// background, so phones and tablets give up MSE's faster start for that.
function prefersNativeStream(): boolean {
  if (typeof navigator === 'undefined') return false;
  const { userAgentData } = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };
  if (userAgentData?.mobile) return true;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  // iPadOS reports itself as desktop Safari.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

function setMediaSessionHandler(
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
) {
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    // Browsers throw for actions they don't support.
  }
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
  stationName = '',
  autoPlay = false,
  pollIntervalMs = 5000,
}: UseRadioStreamParams = {}): UseRadioStreamResult {
  const studioId = useStudioId();
  const studioBaseUrl = `${STUDIO_URL}/${studioId}`;
  const [listenerId] = React.useState(getOrCreateListenerClientId);
  const streamUrl = `${studioBaseUrl}/listen?lid=${encodeURIComponent(listenerId)}`;
  const nowUrl = `${studioBaseUrl}/now`;
  const statusUrl = `${studioBaseUrl}/status`;

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  // Tracks user intent (as opposed to `status`, which reflects the live
  // connection) so a network drop/reconnect can resume playback without the
  // user having pressed play again.
  const shouldBePlayingRef = React.useRef(false);
  const reconnectTimerRef = React.useRef<number | null>(null);
  const reconnectAttemptRef = React.useRef(0);
  // Last time playback was seen moving (or a connection attempt started). The
  // stall watchdog and the visibility check compare against it.
  const lastProgressAtRef = React.useRef(0);
  // Lets the audio element's listeners and the MSE pump, which are set up
  // before `scheduleReconnect` exists, trigger a reconnect.
  const scheduleReconnectRef = React.useRef<() => void>(() => {});
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

  const clearReconnectTimer = React.useCallback(() => {
    if (reconnectTimerRef.current === null) return;
    window.clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }, []);

  React.useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';
    audio.volume = volumeState;
    audio.muted = muted;

    const onPlaying = () => {
      reconnectAttemptRef.current = 0;
      lastProgressAtRef.current = Date.now();
      setStatus('playing');
    };
    const onTimeUpdate = () => {
      lastProgressAtRef.current = Date.now();
    };
    const onPause = () =>
      setStatus((prev) => (prev === 'error' ? prev : 'paused'));
    const onError = () => {
      if (shouldBePlayingRef.current) {
        scheduleReconnectRef.current();
        return;
      }
      setErrorMessage('Failed to play stream');
      setStatus('error');
    };
    // A plain <audio src> ends when the server closes the stream (e.g. it
    // evicted us as a slow listener while the phone slept).
    const onEnded = () => {
      if (shouldBePlayingRef.current) scheduleReconnectRef.current();
    };
    const onWaiting = () => {
      if (!audio.paused) setStatus('buffering');
    };
    const onStalled = () => {
      if (!audio.paused) setStatus('buffering');
    };

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('stalled', onStalled);

    return () => {
      clearReconnectTimer();
      teardownStream();
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('stalled', onStalled);
      audioRef.current = null;
    };
  }, [streamUrl, teardownStream, clearReconnectTimer]);

  React.useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volumeState;
  }, [volumeState]);

  React.useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  // audio.play() rejects with NotAllowedError when the browser wants a user
  // gesture first (common for a retry made in the background). Retrying can't
  // fix that, so drop to idle and wait for a tap. AbortError only means a
  // newer load, such as our own reconnect, replaced this one.
  const handlePlayRejected = React.useCallback((err: unknown) => {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      shouldBePlayingRef.current = false;
      setStatus('idle');
      return;
    }
    scheduleReconnectRef.current();
  }, []);

  // Opens a fresh connection and starts playback, for the user's play and
  // for every automatic reconnect.
  const connect = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    clearReconnectTimer();
    setErrorMessage('');
    setStatus('buffering');
    lastProgressAtRef.current = Date.now();
    // Always (re)connect fresh rather than resuming a stale buffer — this is
    // a live stream, not seekable media.
    teardownStream();

    const playNative = () => {
      audio.src = streamUrl;
      audio.play().catch(handlePlayRejected);
    };

    if (!supportsMseStream() || prefersNativeStream()) {
      playNative();
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const onStreamEnded = () => {
      if (abortRef.current === controller) scheduleReconnectRef.current();
    };
    startMseStream(audio, streamUrl, controller.signal, onStreamEnded)
      .then(() => {
        if (controller.signal.aborted) return;
        audio.play().catch((err) => {
          if (!controller.signal.aborted) handlePlayRejected(err);
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        // Fall back to letting the browser handle the raw stream directly.
        playNative();
      });
  }, [streamUrl, teardownStream, clearReconnectTimer, handlePlayRejected]);

  // Retries with exponential backoff while the user still wants playback.
  // Status stays 'buffering' meanwhile, so the button still offers stop.
  const scheduleReconnect = React.useCallback(() => {
    if (!shouldBePlayingRef.current || reconnectTimerRef.current !== null) {
      return;
    }
    teardownStream();
    const backoff = Math.min(
      RECONNECT_MAX_DELAY_MS,
      RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttemptRef.current,
    );
    // Random spread over the upper half: when the server drops everyone at
    // once (a restart, a studio going off air), listeners don't all come back
    // in the same instant.
    const delay = backoff / 2 + Math.random() * (backoff / 2);
    reconnectAttemptRef.current += 1;
    setStatus('buffering');
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      if (shouldBePlayingRef.current) connect();
    }, delay);
  }, [connect, teardownStream]);

  React.useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  const play = React.useCallback(() => {
    shouldBePlayingRef.current = true;
    reconnectAttemptRef.current = 0;
    connect();
  }, [connect]);

  const stop = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    shouldBePlayingRef.current = false;
    clearReconnectTimer();
    teardownStream();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setStatus('idle');
  }, [teardownStream, clearReconnectTimer]);

  const togglePlayback = React.useCallback(() => {
    if (isPlaying || isBuffering) {
      stop();
    } else {
      play();
    }
  }, [isPlaying, isBuffering, play, stop]);

  // Autoplay, and keep playing when the stream URL changes: switching
  // language, or this studio going off air so the language falls back to the
  // default studio, swaps the audio element, and a listener who was playing
  // should hear the new studio without pressing play again.
  React.useEffect(() => {
    if (autoPlay) shouldBePlayingRef.current = true;
    if (!shouldBePlayingRef.current) return;
    reconnectAttemptRef.current = 0;
    connect();
  }, [autoPlay, connect]);

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

  // Some dead connections never error: the socket just goes quiet (the server
  // stopped writing to a sleeping phone, a captive Wi-Fi, ...). Treat a long
  // stretch of buffering without progress as a drop.
  React.useEffect(() => {
    if (status !== 'buffering') return undefined;
    const timer = window.setInterval(() => {
      if (!shouldBePlayingRef.current) return;
      if (Date.now() - lastProgressAtRef.current > STALL_TIMEOUT_MS) {
        scheduleReconnect();
      }
    }, STALL_CHECK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [status, scheduleReconnect]);

  // The screen coming back on is when a stream that the OS froze or dropped
  // in the background can be fixed. Reconnect right away (skipping any
  // backoff wait) unless playback is still moving.
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (!shouldBePlayingRef.current) return;
      const stalled =
        Date.now() - lastProgressAtRef.current > STALL_TIMEOUT_MS;
      if (stalled || reconnectTimerRef.current !== null) play();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [play]);

  // Lock-screen / notification controls. Registering as a media session also
  // makes mobile OSes less eager to suspend the page.
  React.useEffect(() => {
    if (!('mediaSession' in navigator)) return undefined;
    setMediaSessionHandler('play', play);
    setMediaSessionHandler('pause', stop);
    setMediaSessionHandler('stop', stop);
    return () => {
      setMediaSessionHandler('play', null);
      setMediaSessionHandler('pause', null);
      setMediaSessionHandler('stop', null);
    };
  }, [play, stop]);

  React.useEffect(() => {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') {
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack || stationName,
      artist: stationName,
      artwork: MEDIA_SESSION_ARTWORK,
    });
  }, [currentTrack, stationName]);

  React.useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState =
      isPlaying || isBuffering ? 'playing' : 'paused';
  }, [isPlaying, isBuffering]);

  const setVolume = React.useCallback((value: number) => {
    setMuted(false);
    setVolumeState(Math.max(0, Math.min(1, value)));
  }, []);

  const toggleMute = React.useCallback(() => setMuted((m) => !m), []);

  // radio-studio answers 404 once this studio is deactivated. Re-ask which
  // studios are on air: the language then falls back to the default studio
  // and playback moves there (see the autoplay effect). Throttled, since the
  // studio can also be missing for a moment while it is being registered.
  const apollo = useApolloClient();
  const lastStudioRefetchRef = React.useRef(0);
  const onStudioMissingRef = React.useRef(() => {});
  React.useEffect(() => {
    onStudioMissingRef.current = () => {
      const now = Date.now();
      if (now - lastStudioRefetchRef.current < STUDIO_REFETCH_MIN_INTERVAL_MS) {
        return;
      }
      lastStudioRefetchRef.current = now;
      void apollo.refetchQueries({ include: ['PublicStudios'] });
    };
  }, [apollo]);

  React.useEffect(() => {
    let isMounted = true;

    const fetchNow = async () => {
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
      try {
        const response = await fetch(statusUrl, { cache: 'no-store' });
        if (response.status === 404) onStudioMissingRef.current();
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
