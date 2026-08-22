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
};

const cleanTrackName = (value?: string) =>
  value ? value.replace(/\.[a-zA-Z0-9]+$/, '') : '';

export function useRadioStream({
  streamUrl,
  nowUrl,
  statusUrl,
  autoPlay = false,
  pollIntervalMs = 5000,
}: UseRadioStreamParams): UseRadioStreamResult {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = React.useState<RadioStreamStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [volume, setVolumeState] = React.useState(0.85);
  const [muted, setMuted] = React.useState(false);

  const [isLive, setIsLive] = React.useState(false);
  const [currentTrack, setCurrentTrack] = React.useState('');
  const [nextTrack, setNextTrack] = React.useState('');
  const [elapsedSec, setElapsedSec] = React.useState(0);
  const [metadataError, setMetadataError] = React.useState('');

  const isPlaying = status === 'playing';
  const isBuffering = status === 'buffering';

  React.useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';
    audio.volume = volume;
    audio.muted = muted;

    const onPlaying = () => setStatus('playing');
    const onPause = () => setStatus((prev) => (prev === 'error' ? prev : 'paused'));
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

    if (autoPlay) {
      setStatus('buffering');
      audio.src = streamUrl;
      audio.play().catch(() => setStatus('idle'));
    }

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('stalled', onStalled);
      audioRef.current = null;
    };
  }, [streamUrl, autoPlay]);

  React.useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  React.useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const play = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setErrorMessage('');
    setStatus('buffering');
    // Always (re)connect fresh rather than resuming a stale buffer — this is
    // a live stream, not seekable media.
    audio.src = streamUrl;
    audio.play().catch(() => setStatus('idle'));
  }, [streamUrl]);

  const stop = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setStatus('idle');
  }, []);

  const togglePlayback = React.useCallback(() => {
    if (isPlaying || isBuffering) {
      stop();
    } else {
      play();
    }
  }, [isPlaying, isBuffering, play, stop]);

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
  }, [nowUrl, statusUrl, pollIntervalMs]);

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
    volume,
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
  };
}
