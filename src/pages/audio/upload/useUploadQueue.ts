import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCancelUploadMutation,
  useFinalizeUploadMutation,
  useRequestUploadMutation,
} from '@graphql/hooks';
import { useStudioId } from '@components/providers';
import {
  ACTIVE_STATUSES,
  MAX_CONCURRENCY,
  RECOMMENDED_MAX_FILE_SIZE,
  STARTABLE_STATUSES,
} from './constants';
import type { UploadItem, UploadSummary } from './types';
import { computeSHA256, isAudioFile, uploadInChunks } from './utils';

const fileKey = (file: File) =>
  `${file.name}:${file.size}:${file.lastModified}`;

/**
 * Upload queue for the studio library.
 *
 * Flow per file:
 * 0) SHA-256 the file in the browser
 * 1) requestUpload (GraphQL) with the hash -> { uploadId, chunkUrl, uploadToken, trackId },
 *    or { duplicateOf } when that exact file is already in the library (nothing is sent)
 * 2) PUT the file in chunks to chunkUrl (see uploadInChunks)
 * 3) finalizeUpload (GraphQL) -> server queues processing (Celery), which also
 *    flags likely duplicates by title + artist + length
 *
 * Up to MAX_CONCURRENCY files upload in parallel once "start all" is pressed.
 */
export const useUploadQueue = (onTracksChanged?: () => void) => {
  const { t } = useTranslation('audio');
  const studioId = useStudioId();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [running, setRunning] = useState(0);
  const [autoStart, setAutoStart] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);
  const [alreadyListedCount, setAlreadyListedCount] = useState(0);

  const [requestUpload] = useRequestUploadMutation();
  const [finalizeUpload] = useFinalizeUploadMutation();
  const [cancelUpload] = useCancelUploadMutation();

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
    const all = Array.from(files);
    const audio = all.filter(isAudioFile);
    // Picking the same file twice would race two uploads of one hash.
    const listed = new Set(itemsRef.current.map((it) => fileKey(it.file)));
    const fresh = audio.filter((file) => !listed.has(fileKey(file)));
    setSkippedCount(all.length - audio.length);
    setAlreadyListedCount(audio.length - fresh.length);
    const newItems: UploadItem[] = fresh.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'queued',
      progress: 0,
      bytesSent: 0,
      totalBytes: file.size,
    }));
    setItems((prev) => [...newItems, ...prev]);
  }, []);

  const startOne = useCallback(
    async (item: UploadItem) => {
      if (!STARTABLE_STATUSES.includes(item.status)) return;

      runningRef.current += 1;
      setRunning(runningRef.current);

      const id = item.id;
      const file = item.file;
      const abort = new AbortController();
      updateItem(id, {
        status: 'checking',
        message: undefined,
        abort,
        progress: 0,
        bytesSent: 0,
      });

      let uploadId: string | undefined;
      try {
        const checksum = await computeSHA256(file, abort.signal).catch(
          (err: unknown) => {
            if (err instanceof Error && err.name === 'AbortError') throw err;
            return null; // best effort: without a hash only level-2 checks apply
          },
        );

        updateItem(id, { status: 'requesting' });
        const req = await requestUpload({
          variables: {
            studioSlug: studioId,
            fileName: file.name,
            sizeBytes: file.size,
            mimeType: file.type || 'application/octet-stream',
            checksumSha256: checksum,
          },
        });
        const payload = req.data?.requestUpload;
        if (payload?.duplicateOf) {
          updateItem(id, {
            status: 'duplicate',
            message: t('upload.duplicateOf', {
              title: payload.duplicateOf.title || file.name,
            }),
          });
          return;
        }
        if (!payload?.uploadId) throw new Error(t('upload.errors.session'));
        uploadId = payload.uploadId;

        updateItem(id, {
          uploadId: payload.uploadId,
          chunkUrl: payload.chunkUrl!,
          uploadToken: payload.uploadToken!,
          trackId: payload.trackId,
          status: 'uploading',
        });
        onTracksChanged?.();

        await uploadInChunks(
          file,
          payload.chunkUrl!,
          payload.uploadToken!,
          abort.signal,
          (bytesSent) =>
            updateItem(id, {
              bytesSent,
              progress: Math.round((bytesSent / file.size) * 100),
            }),
        );

        updateItem(id, { status: 'finalizing' });
        const fin = await finalizeUpload({
          variables: { uploadId: payload.uploadId, checksumSha256: checksum },
        });
        if (!fin.data?.finalizeUpload?.ok) {
          throw new Error(t('upload.errors.finalize'));
        }

        updateItem(id, { status: 'done', progress: 100 });
        onTracksChanged?.();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          updateItem(id, { status: 'canceled' });
        } else {
          updateItem(id, {
            status: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
        // A retry always opens a new session, so discard this one rather than
        // leave an UPLOADING track behind. Best effort: the hourly cleanup
        // catches anything this misses.
        if (uploadId) {
          cancelUpload({ variables: { uploadId } })
            .then(() => onTracksChanged?.())
            .catch(() => undefined);
        }
      } finally {
        runningRef.current -= 1;
        setRunning(runningRef.current);
      }
    },
    [
      requestUpload,
      finalizeUpload,
      cancelUpload,
      studioId,
      updateItem,
      onTracksChanged,
      t,
    ],
  );

  const schedule = useCallback(() => {
    if (runningRef.current >= MAX_CONCURRENCY) return;
    const available = MAX_CONCURRENCY - runningRef.current;

    const candidates = itemsRef.current.filter(
      (it) => it.status === 'queued' || it.status === 'error',
    );
    candidates.slice(0, available).forEach((it) => startOne(it));
  }, [startOne]);

  useEffect(() => {
    if (autoStart) schedule();
  }, [items, running, autoStart, schedule]);

  const startAll = useCallback(() => {
    setAutoStart(true);
    schedule();
  }, [schedule]);

  const cancelRunning = useCallback(() => {
    setAutoStart(false);
    itemsRef.current.forEach((it) => {
      if (ACTIVE_STATUSES.includes(it.status) && it.abort) {
        it.abort.abort();
      }
    });
  }, []);

  const start = useCallback(
    (id: string) => {
      setAutoStart(false); // manual start
      const it = itemsRef.current.find((x) => x.id === id);
      if (it) startOne(it);
    },
    [startOne],
  );

  const cancel = useCallback((id: string) => {
    itemsRef.current.find((x) => x.id === id)?.abort?.abort();
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.status !== 'done'));
  }, []);

  const dismissSkipped = useCallback(() => {
    setSkippedCount(0);
    setAlreadyListedCount(0);
  }, []);

  const summary = useMemo<UploadSummary>(() => {
    const totalBytes = items.reduce((acc, i) => acc + i.totalBytes, 0);
    const sentBytes = items.reduce((acc, i) => acc + i.bytesSent, 0);
    return {
      total: items.length,
      done: items.filter((i) => i.status === 'done').length,
      errors: items.filter((i) => i.status === 'error').length,
      duplicates: items.filter((i) => i.status === 'duplicate').length,
      uploading: items.filter((i) => ACTIVE_STATUSES.includes(i.status)).length,
      pending: items.filter((i) => i.status === 'queued').length,
      totalBytes,
      oversized: items.filter(
        (i) =>
          i.status === 'queued' && i.totalBytes > RECOMMENDED_MAX_FILE_SIZE,
      ).length,
      overallProgress:
        totalBytes > 0 ? Math.round((sentBytes / totalBytes) * 100) : 0,
    };
  }, [items]);

  // Refreshing or closing the tab aborts uploads and loses the queue, so ask first.
  useEffect(() => {
    if (summary.uploading === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // still required by some browsers to show the prompt
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [summary.uploading]);

  return {
    items,
    summary,
    skippedCount,
    alreadyListedCount,
    addFiles,
    dismissSkipped,
    start,
    cancel,
    remove,
    clearFinished,
    startAll,
    cancelRunning,
  };
};
