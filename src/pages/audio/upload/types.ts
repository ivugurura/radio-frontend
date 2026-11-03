export type UploadStatus =
  | 'queued'
  | 'requesting'
  | 'uploading'
  | 'finalizing'
  | 'done'
  | 'error'
  | 'canceled';

export type UploadItem = {
  id: string; // local UI id
  file: File;
  progress: number; // 0-100
  bytesSent: number;
  totalBytes: number;
  status: UploadStatus;
  /** Error detail from the server or network; status labels come from i18n. */
  message?: string;

  // server session
  uploadId?: string;
  chunkUrl?: string;
  uploadToken?: string;
  trackId?: string;

  // runtime
  abort?: AbortController;
};

export type UploadSummary = {
  total: number;
  done: number;
  errors: number;
  uploading: number;
  pending: number;
  totalBytes: number;
  oversized: number;
  overallProgress: number;
};
