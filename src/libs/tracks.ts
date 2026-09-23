import type { MediasTrackStateChoices, TrackType } from '@graphql/graphql';

export const IN_PROGRESS_STATES: MediasTrackStateChoices[] = [
  'UPLOADING',
  'PENDING',
  'PROCESSING',
];

export const isPlayable = (track: TrackType) => track.state === 'READY';

export const formatTime = (sec: number) => {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};
