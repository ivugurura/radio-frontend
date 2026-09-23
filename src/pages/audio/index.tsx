import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Container,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { NetworkStatus } from '@apollo/client';
import {
  CloudUploadOutlined as CloudUploadOutlinedIcon,
  DeleteOutlineRounded as DeleteOutlineRoundedIcon,
  RefreshRounded as RefreshRoundedIcon,
  SearchRounded as SearchRoundedIcon,
  CloseRounded as CloseRoundedIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { AudioTable } from './AudioTable';
import { IN_PROGRESS_STATES, isPlayable } from '@libs/tracks';
import { useDeleteTrackMutation, useTracksQuery } from '@graphql/hooks';
import { useStudioId } from '@components/providers';
import { AudioPlayer } from '@components/AudioPlayer';
import type { TracksQueryVariables, TrackType } from '@graphql/graphql';
import ConfirmDialog from './ConfirmDialog';
import { UploadForm } from './UploadForm';

const POLL_INTERVAL_MS = 3000;

function useDebounced<T>(value: T, delay = 400): T {
  const [v, setV] = React.useState(value);

  React.useEffect(() => {
    const t = window.setTimeout(() => setV(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);

  return v;
}

/**
 * The tracks connection uses graphene's offset cursors ("arrayconnection:<n>"),
 * so the cursor for any page can be derived instead of walking pages one by one.
 */
const cursorForPage = (page: number, pageSize: number) =>
  page <= 0 ? null : btoa(`arrayconnection:${page * pageSize - 1}`);

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
};

export default function AudioManagerPage() {
  const { t } = useTranslation('audio');
  const studioId = useStudioId();
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [page, setPage] = React.useState(0);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<TrackType[]>([]);
  const [deleting, setDeleting] = React.useState(false);
  const [nowPlaying, setNowPlaying] = React.useState<TrackType | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const notify = (message: string, severity: SnackbarState['severity']) =>
    setSnackbar({ open: true, message, severity });

  const searchDebounced = useDebounced(search.trim(), 350);

  const variables = React.useMemo<TracksQueryVariables>(
    () => ({
      studioSlug: studioId,
      search: searchDebounced || null,
      first: rowsPerPage,
      after: cursorForPage(page, rowsPerPage),
    }),
    [studioId, searchDebounced, rowsPerPage, page],
  );

  const {
    data,
    previousData,
    loading,
    networkStatus,
    error,
    refetch,
    startPolling,
    stopPolling,
  } = useTracksQuery({
    variables,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-and-network',
  });

  const [deleteTrack] = useDeleteTrackMutation();

  // Keep showing the previous page while the next one loads, instead of flashing skeletons.
  const tracks = (data ?? previousData)?.tracks;
  const totalCount = tracks?.totalCount ?? 0;
  const rows = React.useMemo(
    () =>
      tracks?.edges?.map((e) => e?.node).filter((n): n is TrackType => !!n) ??
      [],
    [tracks],
  );

  const inProgressCount = rows.filter((r) =>
    IN_PROGRESS_STATES.includes(r.state),
  ).length;

  // Uploads are processed asynchronously by a worker; poll until every visible
  // track has left the uploading/processing states.
  React.useEffect(() => {
    if (inProgressCount === 0) return;
    startPolling(POLL_INTERVAL_MS);
    return () => stopPolling();
  }, [inProgressCount, startPolling, stopPolling]);

  // If the current page no longer exists (deletions, shrinking results), step back.
  const lastPage = Math.max(0, Math.ceil(totalCount / rowsPerPage) - 1);
  if (data && page > lastPage) {
    setPage(lastPage);
  }

  const backgroundFetching =
    loading && networkStatus !== NetworkStatus.poll && rows.length > 0;
  const searching =
    search.trim() !== searchDebounced || (loading && !!searchDebounced);

  const refreshTracks = React.useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleRefresh = async () => {
    await refetch();
    notify(t('refreshed'), 'info');
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
    setSelected([]);
  };

  const handlePageChange = (next: number) => {
    setPage(next);
    setSelected([]);
  };

  const handleRowsPerPageChange = (next: number) => {
    setRowsPerPage(next);
    setPage(0);
    setSelected([]);
  };

  // --- Playback -------------------------------------------------------------

  const playable = rows.filter(isPlayable);
  const playIndex = nowPlaying
    ? playable.findIndex((r) => r.id === nowPlaying.id)
    : -1;
  const nextTrack = playIndex >= 0 ? playable[playIndex + 1] : undefined;
  const previousTrack = playIndex > 0 ? playable[playIndex - 1] : undefined;

  const handlePlay = (track: TrackType) => {
    if (nowPlaying?.id === track.id) {
      setPlaying((p) => !p);
      return;
    }
    setNowPlaying(track);
    setPlaying(true);
  };

  const playTrack = (track?: TrackType) => {
    if (!track) return;
    setNowPlaying(track);
    setPlaying(true);
  };

  const handleEnded = () => {
    if (nextTrack) playTrack(nextTrack);
    else setPlaying(false);
  };

  const closePlayer = () => {
    setPlaying(false);
    setNowPlaying(null);
  };

  // --- Deletion -------------------------------------------------------------

  const selectedTracks = rows.filter((r) => selected.includes(r.id));

  const confirmDelete = async () => {
    const targets = pendingDelete;
    if (deleting || targets.length === 0) return;
    setDeleting(true);
    const results = await Promise.allSettled(
      targets.map((tr) => deleteTrack({ variables: { trackId: tr.id } })),
    );
    setDeleting(false);
    setPendingDelete([]);

    const failed = results.filter(
      (r) => r.status === 'rejected' || !r.value.data?.deleteTrack?.ok,
    ).length;
    const deletedIds = new Set(targets.map((tr) => tr.id));

    setSelected((prev) => prev.filter((id) => !deletedIds.has(id)));
    if (nowPlaying && deletedIds.has(nowPlaying.id)) closePlayer();
    await refetch();

    if (failed > 0) notify(t('deleteFailed', { count: failed }), 'error');
    else notify(t('audioDeleted', { count: targets.length }), 'success');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('subtitle', { count: totalCount })}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title={t('refresh')}>
            <span>
              <IconButton
                onClick={() => void handleRefresh()}
                disabled={loading && networkStatus !== NetworkStatus.poll}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <RefreshRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<CloudUploadOutlinedIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ borderRadius: 2, px: 2.5 }}
          >
            {t('newAudio')}
          </Button>
        </Stack>
      </Stack>

      <Collapse in={inProgressCount > 0} unmountOnExit>
        <Alert
          severity="info"
          icon={<CircularProgress size={18} thickness={5} />}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          {t('processingHint', { count: inProgressCount })}
        </Alert>
      </Collapse>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error.message}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{ borderRadius: 3, overflow: 'hidden', position: 'relative' }}
      >
        {/* Toolbar: search, or bulk actions while rows are selected */}
        <Box
          sx={(theme) => ({
            px: 2,
            py: 1.5,
            minHeight: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            borderBottom: 1,
            borderColor: 'divider',
            transition: 'background-color 150ms',
            ...(selected.length > 0 && {
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            }),
          })}
        >
          {selected.length > 0 ? (
            <>
              <Typography variant="subtitle2" color="primary" sx={{ flex: 1 }}>
                {t('selected', { count: selected.length })}
              </Typography>
              <Button size="small" onClick={() => setSelected([])}>
                {t('clearSelection')}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="error"
                disableElevation
                startIcon={<DeleteOutlineRoundedIcon />}
                onClick={() => setPendingDelete(selectedTracks)}
              >
                {t('delete')}
              </Button>
            </>
          ) : (
            <>
              <TextField
                size="small"
                placeholder={t('search')}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleSearchChange('');
                }}
                sx={{
                  flex: 1,
                  maxWidth: { sm: 420 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: 'grey.50',
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        {searching ? (
                          <CircularProgress size={18} thickness={5} />
                        ) : (
                          <SearchRoundedIcon fontSize="small" color="action" />
                        )}
                      </InputAdornment>
                    ),
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          edge="end"
                          aria-label={t('clearSearch')}
                          onClick={() => handleSearchChange('')}
                        >
                          <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  },
                }}
              />
              {searchDebounced && !searching && (
                <Typography variant="body2" color="text.secondary">
                  {t('resultsFor', {
                    count: totalCount,
                    query: searchDebounced,
                  })}
                </Typography>
              )}
            </>
          )}
        </Box>

        <Box sx={{ height: 2 }}>
          {backgroundFetching && <LinearProgress sx={{ height: 2 }} />}
        </Box>

        <AudioTable
          rows={rows}
          loading={loading}
          search={searchDebounced}
          selected={selected}
          onSelectedChange={setSelected}
          currentId={nowPlaying?.id ?? null}
          playing={playing}
          onPlay={handlePlay}
          onDelete={setPendingDelete}
          onUploadClick={() => setCreateOpen(true)}
          page={Math.min(page, lastPage)}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </Paper>

      {nowPlaying && (
        <AudioPlayer
          track={nowPlaying}
          playing={playing}
          onPlayingChange={setPlaying}
          onEnded={handleEnded}
          onNext={() => playTrack(nextTrack)}
          onPrevious={() => playTrack(previousTrack)}
          hasNext={!!nextTrack}
          hasPrevious={!!previousTrack}
          onClose={closePlayer}
        />
      )}

      <UploadForm
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          refreshTracks();
        }}
        onTracksChanged={refreshTracks}
      />

      <ConfirmDialog
        open={pendingDelete.length > 0}
        onClose={() => !deleting && setPendingDelete([])}
        onConfirm={() => void confirmDelete()}
        title={t('confirmDeleteTitle', { count: pendingDelete.length })}
        message={
          <Alert severity="warning" icon={false} sx={{ mb: 0 }}>
            {pendingDelete.length === 1
              ? t('confirmDeleteOne', { title: pendingDelete[0].title })
              : t('confirmDeleteBody', { count: pendingDelete.length })}
          </Alert>
        }
        confirmText={deleting ? t('deleting') : t('confirmDeleteAction')}
        cancelText={t('cancel')}
        confirmColor="error"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
