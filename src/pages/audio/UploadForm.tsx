import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from 'react';
import {
  Box,
  Button,
  LinearProgress,
  Typography,
  Paper,
  Dialog,
  Stack,
  List,
  ListItem,
  Tooltip,
  IconButton,
  ListItemText,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Cancel as CancelIcon,
  Replay as ReplayIcon,
} from '@mui/icons-material';
import {
  useFinalizeUploadMutation,
  useRequestUploadMutation,
} from '@graphql/hooks';
import { BASE_API_URL, STUDIO_ID } from '@libs/constants';

/**
 * UploadForm
 *
 * Flow:
 * 1) requestUpload (GraphQL) -> { uploadId, chunkUrl, uploadToken, trackId }
 * 2) upload file in chunks with PUT to chunkUrl
 *    - header: Content-Range: bytes {start}-{end}/{total}
 *    - header: X-Upload-Token: <uploadToken>
 * 3) finalizeUpload (GraphQL) -> trigger processing (Celery)
 *
 * Notes:
 * - This component computes SHA-256 checksum in-browser and sends it to finalizeUpload.
 * - Uses fetch() for chunk PUT so we can set Content-Range and custom headers.
 * - Resumability:
 *   The server returns {"received": <bytes>} after each chunk. The client will use that
 *   value to continue uploading from where the server last recorded.
 *
 * Integration:
 * - Apollo client must be configured in your app.
 * - GraphQL mutations below match the Django schema used in the backend.
 */

const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1 MB
const MAX_CONCURRENCY = 3; // adjust as needed
const MAX_CHECKSUM_SIZE = 32 * 1024 * 1024; // 32 MB: compute SHA-256 client-side up to this size

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  do {
    n = n / 1024;
    i++;
  } while (n >= 1024 && i < units.length - 1);
  return `${n.toFixed(1)} ${units[i]}`;
}

async function computeSHA256(file: File): Promise<string | null> {
  // Avoid large memory usage on big files; backend accepts checksum as optional
  if (!('crypto' in window) || !('subtle' in window.crypto)) return null;
  if (file.size > MAX_CHECKSUM_SIZE) return null;
  const buf = await file.arrayBuffer();
  const hash = await window.crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface UploadFormProps {
  open: boolean;
  onClose: () => void;
}

type UploadStatus =
  | 'queued'
  | 'requesting'
  | 'uploading'
  | 'finalizing'
  | 'done'
  | 'error'
  | 'canceled';

type UploadItem = {
  id: string; // local UI id
  file: File;
  progress: number; // 0-100
  bytesSent: number;
  totalBytes: number;
  status: UploadStatus;
  message?: string;

  // server session
  uploadId?: string;
  chunkUrl?: string;
  uploadToken?: string;
  trackId?: string;

  // runtime
  abort?: AbortController;
};

export const UploadForm = ({ open, onClose }: UploadFormProps) => {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [running, setRunning] = useState(0);
  const [autoStart, setAutoStart] = useState(false);

  const [requestUpload] = useRequestUploadMutation();
  const [finalizeUpload] = useFinalizeUploadMutation();

  const queueRef = useRef<UploadItem[]>([]);
  const runningRef = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }, []);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: UploadItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'queued',
      progress: 0,
      bytesSent: 0,
      totalBytes: file.size,
    }));
    setItems((prev) => [...newItems, ...prev]);
    queueRef.current = [...newItems, ...queueRef.current];
    // Optional auto-start
    // setAutoStart(true);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files);
      e.currentTarget.value = ''; // reset so same file can be chosen again
    },
    [addFiles],
  );

  const startOne = useCallback(
    async (item: UploadItem) => {
      // avoid double start
      if (item.status !== 'queued' && item.status !== 'error') return;

      runningRef.current += 1;
      setRunning(runningRef.current);

      const id = item.id;
      const file = item.file;
      const abort = new AbortController();
      updateItem(id, {
        status: 'requesting',
        message: 'Requesting session...',
        abort,
        progress: 0,
        bytesSent: 0,
      });

      try {
        // 1) Request upload session
        const req = await requestUpload({
          variables: {
            studioSlug: STUDIO_ID,
            fileName: file.name,
            sizeBytes: file.size,
            mimeType: file.type || 'application/octet-stream',
          },
        });
        const payload = req.data?.requestUpload;
        if (!payload) throw new Error('Failed to obtain upload session');

        updateItem(id, {
          uploadId: payload.uploadId,
          chunkUrl: payload.chunkUrl!,
          uploadToken: payload.uploadToken!,
          trackId: payload.trackId,
          status: 'uploading',
          message: 'Uploading...',
        });

        // 2) PUT chunks (linear append, server returns {received})
        const total = file.size;
        let start = 0;
        const chunkSize = DEFAULT_CHUNK_SIZE;

        while (start < total) {
          const end = Math.min(start + chunkSize, total) - 1;
          const blob = file.slice(start, end + 1);
          const contentRange = `bytes ${start}-${end}/${total}`;

          const uploadUrl = BASE_API_URL + payload.chunkUrl;

          const resp = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Range': contentRange!,
              'X-Upload-Token': payload.uploadToken!,
            },
            body: blob,
            signal: abort.signal,
          });

          if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            throw new Error(
              `Chunk failed: ${resp.status} ${resp.statusText} ${text}`,
            );
          }

          const json = (await resp.json().catch(() => ({}))) as {
            received?: number;
          };
          const received =
            typeof json.received === 'number' ? json.received : end + 1;
          start = received;

          updateItem(id, {
            bytesSent: start,
            progress: Math.round((start / total) * 100),
          });
        }

        // 3) Optional checksum then finalize
        updateItem(id, { status: 'finalizing', message: 'Finalizing...' });
        const checksum = await computeSHA256(file).catch(() => null);

        const fin = await finalizeUpload({
          variables: { uploadId: payload.uploadId, checksumSha256: checksum },
        });
        if (!fin.data?.finalizeUpload?.ok) {
          throw new Error('Finalize failed');
        }

        updateItem(id, {
          status: 'done',
          message: 'Queued for processing',
          progress: 100,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          updateItem(id, { status: 'canceled', message: 'Upload canceled' });
        } else if (err instanceof Error) {
          updateItem(id, {
            status: 'error',
            message: err.message,
          });
        } else {
          updateItem(id, {
            status: 'error',
            message: String(err),
          });
        }
      } finally {
        runningRef.current -= 1;
        setRunning(runningRef.current);
      }
    },
    [requestUpload, finalizeUpload, STUDIO_ID, updateItem],
  );

  const schedule = useCallback(() => {
    // Start as many queued/error items as allowed by MAX_CONCURRENCY
    if (runningRef.current >= MAX_CONCURRENCY) return;
    const available = MAX_CONCURRENCY - runningRef.current;

    const candidates = itemsRef.current.filter(
      (it) => it.status === 'queued' || it.status === 'error',
    );
    const nextBatch = candidates.slice(0, available);
    nextBatch.forEach((it) => startOne(it));
  }, [startOne]);

  // Auto-scheduler: whenever items or running changes and autoStart enabled, schedule more
  useEffect(() => {
    if (autoStart) schedule();
  }, [items, running, autoStart, schedule]);

  const onStartAll = useCallback(() => {
    setAutoStart(true);
    schedule();
  }, [schedule]);

  const onPauseAll = useCallback(() => {
    setAutoStart(false);
    // cancel all running
    itemsRef.current.forEach((it) => {
      if (
        (it.status === 'uploading' ||
          it.status === 'finalizing' ||
          it.status === 'requesting') &&
        it.abort
      ) {
        it.abort.abort();
      }
    });
  }, []);

  const onStartOne = useCallback(
    (id: string) => {
      setAutoStart(false); // manual start
      const it = itemsRef.current.find((x) => x.id === id);
      if (it) startOne(it);
    },
    [startOne],
  );

  const onCancelOne = useCallback((id: string) => {
    const it = itemsRef.current.find((x) => x.id === id);
    if (it?.abort) {
      it.abort.abort();
    }
  }, []);

  const summary = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.status === 'done').length;
    const errors = items.filter((i) => i.status === 'error').length;
    const uploading = items.filter(
      (i) =>
        i.status === 'uploading' ||
        i.status === 'finalizing' ||
        i.status === 'requesting',
    ).length;
    return { total, done, errors, uploading, running };
  }, [items, running]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Paper sx={{ p: 3, maxWidth: 980, mx: 'auto' }}>
        <Stack spacing={2}>
          <Typography variant="h6">Upload audio (multiple files)</Typography>

          <Stack direction="row" spacing={2}>
            <Button variant="contained" component="label">
              Select Files
              <input
                hidden
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileInput}
              />
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={onStartAll}
              disabled={
                items.length === 0 ||
                summary.uploading > 0 ||
                summary.done === summary.total
              }
            >
              Start All
            </Button>
            <Button
              variant="outlined"
              onClick={onPauseAll}
              disabled={summary.uploading === 0}
            >
              Cancel Running
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Concurrency: {MAX_CONCURRENCY} • Total: {summary.total} • Running:{' '}
            {summary.running} • Done: {summary.done} • Errors: {summary.errors}
          </Typography>

          <List
            dense
            sx={{
              maxHeight: 520,
              overflow: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            {items.map((it) => (
              <ListItem
                key={it.id}
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    {(it.status === 'queued' || it.status === 'error') && (
                      <Tooltip
                        title={it.status === 'queued' ? 'Start' : 'Retry'}
                      >
                        <IconButton
                          onClick={() => onStartOne(it.id)}
                          size="small"
                        >
                          {it.status === 'queued' ? (
                            <PlayArrowIcon />
                          ) : (
                            <ReplayIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    {(it.status === 'requesting' ||
                      it.status === 'uploading' ||
                      it.status === 'finalizing') && (
                      <Tooltip title="Cancel">
                        <IconButton
                          onClick={() => onCancelOne(it.id)}
                          size="small"
                        >
                          <CancelIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                }
              >
                <Box sx={{ width: '100%' }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{ mb: 0.5 }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {it.file.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ({formatBytes(it.totalBytes)})
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {it.status.toUpperCase()}
                          {it.trackId ? ` • track ${it.trackId}` : ''}
                          {it.message ? ` — ${it.message}` : ''}
                        </Typography>
                      }
                      sx={{ mr: 2 }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ minWidth: 120, textAlign: 'right' }}
                    >
                      {formatBytes(it.bytesSent)} / {formatBytes(it.totalBytes)}{' '}
                      • {it.progress}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={it.progress}
                    color={
                      it.status === 'error'
                        ? 'error'
                        : it.status === 'done'
                          ? 'success'
                          : 'primary'
                    }
                  />
                </Box>
              </ListItem>
            ))}
          </List>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Notes:
            </Typography>
            <ul>
              <li>
                Each file is uploaded using 1 MB chunks with Content-Range and
                X-Upload-Token.
              </li>
              <li>
                Up to {MAX_CONCURRENCY} uploads run in parallel; you can adjust
                MAX_CONCURRENCY in the component.
              </li>
              <li>
                SHA‑256 is computed client‑side only for files ≤{' '}
                {formatBytes(MAX_CHECKSUM_SIZE)} to avoid excessive memory;
                checksum is optional.
              </li>
              <li>
                After finalize, the server enqueues processing (Celery + ffmpeg)
                and publishes to your library directory.
              </li>
            </ul>
          </Box>
        </Stack>
      </Paper>
    </Dialog>
  );
};
