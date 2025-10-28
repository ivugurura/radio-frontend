import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  Box,
  Button,
  LinearProgress,
  TextField,
  Typography,
  Paper,
  Dialog,
} from '@mui/material';
import {
  useFinalizeUploadMutation,
  useRequestUploadMutation,
} from '@graphql/hooks';

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

const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB

interface UploadFormProps {
  open: boolean;
  onClose: () => void;
}
export const UploadForm = ({ open, onClose }: UploadFormProps) => {
  const [studioSlug, setStudioSlug] = useState<string>('reformation-rw');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [trackId, setTrackId] = useState<string | null>(null);

  const [requestUploadMutation] = useRequestUploadMutation();
  const [finalizeUploadMutation] = useFinalizeUploadMutation();

  // Abort control for current upload
  const abortCtrl = useRef<AbortController | null>(null);

  const onSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setProgress(0);
    setStatus(null);
    setTrackId(null);
  }, []);

  const computeSHA256 = useCallback(async (f: File) => {
    const buffer = await f.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex;
  }, []);

  const doUpload = useCallback(
    async (f: File) => {
      setUploading(true);
      setStatus('Requesting upload session...');

      // 1) Request upload session from GraphQL
      const req = await requestUploadMutation({
        variables: {
          studioSlug,
          fileName: f.name,
          sizeBytes: f.size,
          mimeType: f.type || 'application/octet-stream',
        },
      });

      const payload = req.data?.requestUpload;
      if (!payload) {
        setStatus('Failed to obtain upload session');
        setUploading(false);
        return;
      }

      const { uploadId, chunkUrl, uploadToken, trackId: tId } = payload;
      setStatus('Upload session ready. Uploading...');
      setTrackId(tId ?? null);

      // We'll compute checksum at the end (before finalize)
      // 2) Upload chunks
      const total = f.size;
      let start = 0;
      const chunkSize = DEFAULT_CHUNK_SIZE;
      abortCtrl.current = new AbortController();

      try {
        while (start < total) {
          const end = Math.min(start + chunkSize, total) - 1;
          const blob = f.slice(start, end + 1);
          const contentRange = `bytes ${start}-${end}/${total}`;
          const uploadUrl = import.meta.env.VITE_API_URL + chunkUrl;
          const resp = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Range': contentRange!,
              'X-Upload-Token': uploadToken!,
              'Content-Type': 'application/octet-stream',
            },
            body: blob,
            signal: abortCtrl.current.signal,
          });

          if (!resp.ok) {
            // Try to parse server response for a helpful message
            let text = await resp.text().catch(() => '');

            // Check for CORS-related issues
            if (resp.status === 0) {
              throw new Error(
                'Network error - possibly a CORS issue. Check if the server allows PUT requests with custom headers.'
              );
            }

            throw new Error(
              `Upload chunk failed: ${resp.status} ${resp.statusText} ${text}`
            );
          }

          // server returns {"received": <bytes>}
          const json = await resp.json().catch(() => ({}) as any);
          const received =
            typeof json.received === 'number' ? json.received : end + 1;

          // Update start to server-reported position (robust to partial writes)
          start = received;
          setProgress(Math.round((start / total) * 100));
        }

        // 3) Compute checksum (SHA-256) and finalizeUpload
        setStatus('Computing checksum...');
        const checksum = await computeSHA256(f);

        setStatus('Finalizing upload...');
        const fin = await finalizeUploadMutation({
          variables: {
            uploadId,
            checksumSha256: checksum,
          },
        });

        if (fin.data?.finalizeUpload?.ok) {
          setStatus('Upload complete — file queued for processing.');
          setProgress(100);
          setUploading(false);
          return;
        } else {
          setStatus('Finalize failed');
          setUploading(false);
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setStatus('Upload aborted by user');
        } else {
          setStatus(String(err.message || err));
        }
        setUploading(false);
        return;
      } finally {
        abortCtrl.current = null;
      }
    },
    [studioSlug, requestUploadMutation, finalizeUploadMutation, computeSHA256]
  );

  const onStart = useCallback(() => {
    if (!file) {
      setStatus('Select a file first');
      return;
    }
    doUpload(file);
  }, [file, doUpload]);

  const onCancel = useCallback(() => {
    if (abortCtrl.current) {
      abortCtrl.current.abort();
    }
  }, []);

  const progressBar = useMemo(() => {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress variant="determinate" value={progress} />
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          {progress}% {status ? `— ${status}` : ''}
        </Typography>
      </Box>
    );
  }, [progress, status]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Paper sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Upload audio to studio
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Studio slug"
            value={studioSlug}
            onChange={(e) => setStudioSlug(e.target.value)}
            size="small"
          />
          <TextField
            value={file ? file.name : ''}
            label="Selected file"
            size="small"
            InputProps={{
              readOnly: true,
            }}
            sx={{ flex: 1 }}
          />
          <Button variant="contained" component="label">
            Choose
            <input
              hidden
              type="file"
              accept="audio/*"
              onChange={onSelectFile}
            />
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={onStart}
            disabled={!file || uploading}
          >
            Start Upload
          </Button>
          <Button variant="outlined" onClick={onCancel} disabled={!uploading}>
            Cancel
          </Button>
          {trackId && (
            <Typography sx={{ alignSelf: 'center', ml: 2 }}>
              Track id: <code>{trackId}</code>
            </Typography>
          )}
        </Box>

        {progressBar}

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="textSecondary">
            Notes:
          </Typography>
          <ul>
            <li>
              Files are uploaded in 1MB chunks using Content-Range PUT requests.
            </li>
            <li>
              The server returns the number of bytes received after each chunk —
              the client uses that to continue/resume upload.
            </li>
            <li>
              When all chunks are uploaded the client computes a SHA-256
              checksum and calls finalizeUpload to trigger server-side
              processing.
            </li>
            <li>
              Make sure your backend is reachable on the same origin or CORS is
              configured to allow PUT to /api/uploads/&lt;upload_id&gt;/chunk.
            </li>
          </ul>
        </Box>
      </Paper>
    </Dialog>
  );
};
