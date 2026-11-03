import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  PlayArrow as PlayArrowIcon,
  Cancel as CancelIcon,
  Replay as ReplayIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteOutlineIcon,
  CloudUploadOutlined as CloudUploadIcon,
  AudioFileOutlined as AudioFileIcon,
  TipsAndUpdatesOutlined as TipsIcon,
  GraphicEqOutlined as FormatIcon,
  LayersOutlined as BatchIcon,
  LabelOutlined as TagsIcon,
  WifiOutlined as ConnectionIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  useCancelUploadMutation,
  useFinalizeUploadMutation,
  useRequestUploadMutation,
} from "@graphql/hooks";
import { BASE_API_URL } from "@libs/constants";
import { useStudioId } from "@components/providers";

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
 */

const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1 MB
const MAX_CONCURRENCY = 3; // adjust as needed
const MAX_CHECKSUM_SIZE = 32 * 1024 * 1024; // 32 MB: compute SHA-256 client-side up to this size

// Soft limits shown in the guidelines; exceeding them warns but never blocks.
const RECOMMENDED_BATCH_SIZE = 20;
const RECOMMENDED_MAX_FILE_SIZE = 250 * 1024 * 1024; // 250 MB

// Mirrors the backend transcoder defaults (DEFAULT_TARGET_BR_KBPS / DEFAULT_TARGET_SR_HZ).
const TARGET_BITRATE_KBPS = 128;
const TARGET_SAMPLE_RATE_KHZ = 48;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do {
    n = n / 1024;
    i++;
  } while (n >= 1024 && i < units.length - 1);
  return `${n.toFixed(1)} ${units[i]}`;
}

async function computeSHA256(file: File): Promise<string | null> {
  // Avoid large memory usage on big files; backend accepts checksum as optional
  if (!("crypto" in window) || !("subtle" in window.crypto)) return null;
  if (file.size > MAX_CHECKSUM_SIZE) return null;
  const buf = await file.arrayBuffer();
  const hash = await window.crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isAudioFile(file: File) {
  if (file.type) return file.type.startsWith("audio/");
  // Some browsers leave type empty for e.g. .flac; fall back to the extension.
  return /\.(mp3|wav|flac|m4a|aac|ogg|oga|opus|wma|aiff?)$/i.test(file.name);
}

type UploadFormProps = Readonly<{
  open: boolean;
  onClose: () => void;
  /** Called when a track row is created or queued for processing, so lists can refetch. */
  onTracksChanged?: () => void;
}>;

type UploadStatus =
  | "queued"
  | "requesting"
  | "uploading"
  | "finalizing"
  | "done"
  | "error"
  | "canceled";

type UploadItem = {
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

const ACTIVE_STATUSES: UploadStatus[] = [
  "requesting",
  "uploading",
  "finalizing",
];
const STARTABLE_STATUSES: UploadStatus[] = ["queued", "error", "canceled"];

const PROGRESS_COLOR: Partial<
  Record<UploadStatus, "error" | "success" | "primary">
> = {
  error: "error",
  done: "success",
};

const STATUS_CHIP_COLOR: Record<
  UploadStatus,
  "default" | "primary" | "success" | "error" | "warning"
> = {
  queued: "default",
  requesting: "primary",
  uploading: "primary",
  finalizing: "primary",
  done: "success",
  error: "error",
  canceled: "warning",
};

const GUIDELINES = [
  { key: "formats", icon: FormatIcon },
  { key: "batch", icon: BatchIcon },
  { key: "tags", icon: TagsIcon },
  { key: "connection", icon: ConnectionIcon },
] as const;

export const UploadForm = ({
  open,
  onClose,
  onTracksChanged,
}: UploadFormProps) => {
  const { t } = useTranslation("audio");
  const studioId = useStudioId();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [running, setRunning] = useState(0);
  const [autoStart, setAutoStart] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);

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
    setSkippedCount(all.length - audio.length);
    const newItems: UploadItem[] = audio.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "queued",
      progress: 0,
      bytesSent: 0,
      totalBytes: file.size,
    }));
    setItems((prev) => [...newItems, ...prev]);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files);
      e.currentTarget.value = ""; // reset so same file can be chosen again
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const startOne = useCallback(
    async (item: UploadItem) => {
      if (!STARTABLE_STATUSES.includes(item.status)) return;

      runningRef.current += 1;
      setRunning(runningRef.current);

      const id = item.id;
      const file = item.file;
      const abort = new AbortController();
      updateItem(id, {
        status: "requesting",
        message: undefined,
        abort,
        progress: 0,
        bytesSent: 0,
      });

      let uploadId: string | undefined;
      try {
        const req = await requestUpload({
          variables: {
            studioSlug: studioId,
            fileName: file.name,
            sizeBytes: file.size,
            mimeType: file.type || "application/octet-stream",
          },
        });
        const payload = req.data?.requestUpload;
        if (!payload) throw new Error(t("upload.errors.session"));
        uploadId = payload.uploadId;

        updateItem(id, {
          uploadId: payload.uploadId,
          chunkUrl: payload.chunkUrl!,
          uploadToken: payload.uploadToken!,
          trackId: payload.trackId,
          status: "uploading",
        });
        onTracksChanged?.();

        const total = file.size;
        let start = 0;
        const chunkSize = DEFAULT_CHUNK_SIZE;

        while (start < total) {
          const end = Math.min(start + chunkSize, total) - 1;
          const blob = file.slice(start, end + 1);
          const contentRange = `bytes ${start}-${end}/${total}`;

          const uploadUrl = BASE_API_URL + payload.chunkUrl;

          const resp = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Range": contentRange!,
              "X-Upload-Token": payload.uploadToken!,
            },
            body: blob,
            signal: abort.signal,
          });

          if (!resp.ok) {
            const text = await resp.text().catch(() => "");
            throw new Error(
              `Chunk failed: ${resp.status} ${resp.statusText} ${text}`,
            );
          }

          const json = (await resp.json().catch(() => ({}))) as {
            received?: number;
          };
          const received =
            typeof json.received === "number" ? json.received : end + 1;
          start = received;

          updateItem(id, {
            bytesSent: start,
            progress: Math.round((start / total) * 100),
          });
        }

        updateItem(id, { status: "finalizing" });
        const checksum = await computeSHA256(file).catch(() => null);

        const fin = await finalizeUpload({
          variables: { uploadId: payload.uploadId, checksumSha256: checksum },
        });
        if (!fin.data?.finalizeUpload?.ok) {
          throw new Error(t("upload.errors.finalize"));
        }

        updateItem(id, { status: "done", progress: 100 });
        onTracksChanged?.();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          updateItem(id, { status: "canceled" });
        } else if (err instanceof Error) {
          updateItem(id, {
            status: "error",
            message: err.message,
          });
        } else {
          updateItem(id, {
            status: "error",
            message: String(err),
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
      (it) => it.status === "queued" || it.status === "error",
    );
    const nextBatch = candidates.slice(0, available);
    nextBatch.forEach((it) => startOne(it));
  }, [startOne]);

  useEffect(() => {
    if (autoStart) schedule();
  }, [items, running, autoStart, schedule]);

  const onStartAll = useCallback(() => {
    setAutoStart(true);
    schedule();
  }, [schedule]);

  const onPauseAll = useCallback(() => {
    setAutoStart(false);
    itemsRef.current.forEach((it) => {
      if (ACTIVE_STATUSES.includes(it.status) && it.abort) {
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

  const onRemoveOne = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const onClearFinished = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.status !== "done"));
  }, []);

  const summary = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.status === "done").length;
    const errors = items.filter((i) => i.status === "error").length;
    const uploading = items.filter((i) =>
      ACTIVE_STATUSES.includes(i.status),
    ).length;
    const pending = items.filter((i) => i.status === "queued").length;
    const totalBytes = items.reduce((acc, i) => acc + i.totalBytes, 0);
    const sentBytes = items.reduce((acc, i) => acc + i.bytesSent, 0);
    const oversized = items.filter(
      (i) => i.status === "queued" && i.totalBytes > RECOMMENDED_MAX_FILE_SIZE,
    ).length;
    const overallProgress =
      totalBytes > 0 ? Math.round((sentBytes / totalBytes) * 100) : 0;
    return {
      total,
      done,
      errors,
      uploading,
      pending,
      running,
      totalBytes,
      oversized,
      overallProgress,
    };
  }, [items, running]);

  // Refreshing or closing the tab aborts uploads and loses the queue, so ask first.
  useEffect(() => {
    if (summary.uploading === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // still required by some browsers to show the prompt
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [summary.uploading]);

  const handleDialogClose = useCallback(
    (_e: unknown, reason?: "backdropClick" | "escapeKeyDown") => {
      // Avoid losing the queue to a stray click while files are uploading.
      if (reason === "backdropClick" && summary.uploading > 0) return;
      onClose();
    },
    [onClose, summary.uploading],
  );

  const guidelineValues = {
    kbps: TARGET_BITRATE_KBPS,
    khz: TARGET_SAMPLE_RATE_KHZ,
    batch: RECOMMENDED_BATCH_SIZE,
    concurrency: MAX_CONCURRENCY,
    size: formatBytes(RECOMMENDED_MAX_FILE_SIZE),
  };

  const renderRowActions = (it: UploadItem) => {
    if (ACTIVE_STATUSES.includes(it.status)) {
      return (
        <Tooltip title={t("upload.actions.cancel")}>
          <IconButton onClick={() => onCancelOne(it.id)} size="small">
            <CancelIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    }
    return (
      <>
        {STARTABLE_STATUSES.includes(it.status) && (
          <Tooltip
            title={
              it.status === "queued"
                ? t("upload.actions.start")
                : t("upload.actions.retry")
            }
          >
            <IconButton onClick={() => onStartOne(it.id)} size="small">
              {it.status === "queued" ? (
                <PlayArrowIcon fontSize="small" />
              ) : (
                <ReplayIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={t("upload.actions.remove")}>
          <IconButton onClick={() => onRemoveOne(it.id)} size="small">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="lg"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
          {t("upload.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("upload.subtitle")}
        </Typography>
        <IconButton
          aria-label={t("upload.actions.close")}
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 2fr) minmax(0, 1fr)",
            },
          }}
        >
          {/* Left: drop zone + queue */}
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Box
              component="label"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={(theme) => ({
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                py: 4,
                px: 2,
                textAlign: "center",
                cursor: "pointer",
                borderRadius: 2,
                border: "2px dashed",
                borderColor: dragging ? "primary.main" : "divider",
                bgcolor: dragging
                  ? alpha(theme.palette.primary.main, 0.08)
                  : "action.hover",
                transition: "border-color 120ms, background-color 120ms",
                "&:hover": { borderColor: "primary.main" },
              })}
            >
              <CloudUploadIcon color="primary" sx={{ fontSize: 44 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {t("upload.dropTitle")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("upload.dropHint", { batch: RECOMMENDED_BATCH_SIZE })}
              </Typography>
              <input
                hidden
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileInput}
              />
            </Box>

            {skippedCount > 0 && (
              <Alert severity="warning" onClose={() => setSkippedCount(0)}>
                {t("upload.warnings.skipped", { count: skippedCount })}
              </Alert>
            )}
            {summary.total > RECOMMENDED_BATCH_SIZE && (
              <Alert severity="info">
                {t("upload.warnings.largeBatch", {
                  count: summary.total,
                  batch: RECOMMENDED_BATCH_SIZE,
                })}
              </Alert>
            )}
            {summary.oversized > 0 && (
              <Alert severity="info">
                {t("upload.warnings.largeFiles", {
                  count: summary.oversized,
                  size: formatBytes(RECOMMENDED_MAX_FILE_SIZE),
                })}
              </Alert>
            )}

            {items.length > 0 && (
              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  flexWrap="wrap"
                  useFlexGap
                  spacing={1}
                  sx={{ mb: 1 }}
                >
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      label={t("upload.summary.files", {
                        count: summary.total,
                        size: formatBytes(summary.totalBytes),
                      })}
                    />
                    {summary.uploading > 0 && (
                      <Chip
                        size="small"
                        color="primary"
                        label={t("upload.summary.uploading", {
                          count: summary.uploading,
                        })}
                      />
                    )}
                    {summary.done > 0 && (
                      <Chip
                        size="small"
                        color="success"
                        label={t("upload.summary.done", {
                          count: summary.done,
                        })}
                      />
                    )}
                    {summary.errors > 0 && (
                      <Chip
                        size="small"
                        color="error"
                        label={t("upload.summary.errors", {
                          count: summary.errors,
                        })}
                      />
                    )}
                  </Stack>
                  {summary.done > 0 && (
                    <Button size="small" onClick={onClearFinished}>
                      {t("upload.actions.clearFinished")}
                    </Button>
                  )}
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={summary.overallProgress}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}

            {items.length > 0 && (
              <List
                dense
                disablePadding
                sx={{
                  maxHeight: 360,
                  overflow: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                {items.map((it, idx) => (
                  <ListItem
                    key={it.id}
                    divider={idx < items.length - 1}
                    sx={{ py: 1.25, alignItems: "flex-start", gap: 1.5 }}
                  >
                    <AudioFileIcon color="action" sx={{ mt: 0.25 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mb: 0.5 }}
                      >
                        <Typography
                          variant="body2"
                          noWrap
                          title={it.file.name}
                          sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}
                        >
                          {it.file.name}
                        </Typography>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={STATUS_CHIP_COLOR[it.status]}
                          label={t(`upload.status.${it.status}`)}
                        />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={it.progress}
                        color={PROGRESS_COLOR[it.status] ?? "primary"}
                        sx={{ borderRadius: 2 }}
                      />
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mt: 0.5 }}
                      >
                        <Typography
                          variant="caption"
                          color={it.message ? "error" : "text.secondary"}
                          noWrap
                          title={it.message}
                          sx={{ minWidth: 0 }}
                        >
                          {it.message ?? ""}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ whiteSpace: "nowrap" }}
                        >
                          {formatBytes(it.bytesSent)} /{" "}
                          {formatBytes(it.totalBytes)} • {it.progress}%
                        </Typography>
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      {renderRowActions(it)}
                    </Stack>
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>

          {/* Right: guidelines */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "action.hover",
              alignSelf: "start",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 1.25 }}
            >
              <TipsIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("upload.guidelines.title")}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              {GUIDELINES.map(({ key, icon: Icon }) => (
                <Stack key={key} direction="row" spacing={1}>
                  <Icon
                    fontSize="small"
                    sx={{ color: "text.secondary", mt: 0.125 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    <Box
                      component="span"
                      sx={{ fontWeight: 600, color: "text.primary" }}
                    >
                      {t(`upload.guidelines.${key}.title`)}:
                    </Box>{" "}
                    {t(`upload.guidelines.${key}.body`, guidelineValues)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mr: "auto" }}
        >
          {t("upload.concurrencyHint", { count: MAX_CONCURRENCY })}
        </Typography>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onPauseAll}
          disabled={summary.uploading === 0}
        >
          {t("upload.actions.cancelRunning")}
        </Button>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={onStartAll}
          disabled={
            summary.pending + summary.errors === 0 || summary.uploading > 0
          }
        >
          {t("upload.actions.startAll", {
            count: summary.pending + summary.errors,
          })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
