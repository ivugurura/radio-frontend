import type { UploadStatus } from './types';

export const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1 MB
export const MAX_CONCURRENCY = 3; // adjust as needed
export const HASH_READ_SIZE = 4 * 1024 * 1024; // 4 MB slices keep hashing memory flat for any file size

// Soft limits shown in the guidelines; exceeding them warns but never blocks.
export const RECOMMENDED_BATCH_SIZE = 20;
export const RECOMMENDED_MAX_FILE_SIZE = 250 * 1024 * 1024; // 250 MB

// Mirrors the backend transcoder defaults (DEFAULT_TARGET_BR_KBPS / DEFAULT_TARGET_SR_HZ).
export const TARGET_BITRATE_KBPS = 128;
export const TARGET_SAMPLE_RATE_KHZ = 48;

export const ACTIVE_STATUSES: UploadStatus[] = [
  'checking',
  'requesting',
  'uploading',
  'finalizing',
];
export const STARTABLE_STATUSES: UploadStatus[] = [
  'queued',
  'error',
  'canceled',
];

export const PROGRESS_COLOR: Partial<
  Record<UploadStatus, 'error' | 'success' | 'primary'>
> = {
  error: 'error',
  done: 'success',
};

export const MESSAGE_COLOR: Partial<Record<UploadStatus, string>> = {
  error: 'error',
  duplicate: 'warning.main',
};

export const STATUS_CHIP_COLOR: Record<
  UploadStatus,
  'default' | 'primary' | 'success' | 'error' | 'warning'
> = {
  queued: 'default',
  checking: 'primary',
  requesting: 'primary',
  uploading: 'primary',
  finalizing: 'primary',
  done: 'success',
  error: 'error',
  canceled: 'warning',
  duplicate: 'warning',
};
