import * as React from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Typography,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { AudioTable } from './AudioTable';
import { useTracksQuery } from '@graphql/hooks';
import { STUDIO_ID } from '@libs/constants';
import type { TracksQueryVariables, TrackType } from '@graphql/graphql';
// import CreateAudioDialog from './CreateAudioDialog';
import ConfirmDialog from './ConfirmDialog';
import type { Audio } from './types';
import { UploadForm } from './UploadForm';

// UI-only mock data
const seedAudios: Audio[] = [
  {
    id: 'a_1001',
    title: 'Morning News',
    artist: 'Radio One',
    durationSec: 186,
    tags: ['news', 'morning'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'ready',
  },
  {
    id: 'a_1002',
    title: 'Late Night Jazz',
    artist: 'DJ Smooth',
    durationSec: 312,
    tags: ['music', 'jazz'],
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    status: 'processing',
  },
  {
    id: 'a_1003',
    title: 'Tech Talk Ep. 42',
    artist: 'DevCast',
    durationSec: 2540,
    tags: ['talk', 'interview'],
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    status: 'failed',
  },
];

function useDebounced<T>(value: T, delay = 400): T {
  const [v, setV] = React.useState(value);

  React.useEffect(() => {
    const t = window.setTimeout(() => setV(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);

  return v;
}

export default function AudioManagerPage() {
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [after, setAfter] = React.useState<string | null>(null);

  // UI state
  // const [loading, setLoading] = React.useState(false);
  const [audios, setAudios] = React.useState<Audio[]>(seedAudios);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState('');
  // const [page, setPage] = React.useState(0);
  // const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity?: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const searchDebounced = useDebounced(search, 400);

  const variables = React.useMemo<TracksQueryVariables>(
    () => ({
      studioSlug: STUDIO_ID,
      search: searchDebounced || null,
      first: rowsPerPage,
      after,
    }),
    [searchDebounced, rowsPerPage, after],
  );

  const { data, loading, refetch, fetchMore } = useTracksQuery({
    variables,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-and-network',
  });

  const endCursor = data?.tracks?.pageInfo?.endCursor ?? null;
  const hasNextPage = data?.tracks?.pageInfo?.hasNextPage ?? false;
  const totalCount = data?.tracks?.totalCount ?? 0;
  const rows =
    data?.tracks?.edges
      ?.map((e) => e?.node)
      .filter((n): n is TrackType => !!n) ?? [];

  // Simulated fetch
  const refresh = async () => {
    await refetch(variables);
    setSnackbar({ open: true, message: 'Refreshed', severity: 'info' });
  };

  const handleChangePage = React.useCallback(
    async (newPage: number) => {
      if (newPage === 0) {
        setAfter(null);
        await refetch({ ...variables, after: null });
        return;
      }

      if (hasNextPage && endCursor) {
        setAfter(endCursor);
        await fetchMore({ variables: { ...variables, after: endCursor } });
      }
    },
    [endCursor, hasNextPage, variables, fetchMore, refetch],
  );

  const handleRowsPerPageChange = React.useCallback(
    async (nextRows: number) => {
      setRowsPerPage(nextRows);
      setAfter(null);
      await refetch({
        ...variables,
        first: nextRows,
        after: null,
      });
    },
    [variables, refetch],
  );

  // const handleToggleSelect = (id: string) => {
  //   setSelected((prev) =>
  //     prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
  //   );
  // };

  // const handleToggleSelectAll = (checked: boolean) => {
  //   const visibleIds = filteredAudios
  //     .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  //     .map((a) => a.id);
  //   if (checked) {
  //     setSelected((prev) => Array.from(new Set([...prev, ...visibleIds])));
  //   } else {
  //     setSelected((prev) => prev.filter((id) => !visibleIds.includes(id)));
  //   }
  // };

  // const handleDeleteOne = (id: string) => {
  //   setSelected([id]);
  //   setConfirmDeleteOpen(true);
  // };

  const handleBulkDelete = () => {
    if (selected.length === 0) return;
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    setAudios((prev) => prev.filter((a) => !selected.includes(a.id)));
    setSelected([]);
    setConfirmDeleteOpen(false);
    setSnackbar({ open: true, message: 'Audio deleted', severity: 'success' });
  };

  // const handleCreate = (
  //   input: Omit<Audio, 'id' | 'createdAt'> & { file?: File | null }
  // ) => {
  //   const newAudio: Audio = {
  //     id: `a_${Math.floor(Math.random() * 100000)}`,
  //     title: input.title,
  //     artist: input.artist,
  //     durationSec: input.durationSec ?? undefined,
  //     tags: input.tags,
  //     createdAt: new Date().toISOString(),
  //     status: 'processing',
  //   };
  //   setAudios((prev) => [newAudio, ...prev]);
  //   setSnackbar({
  //     open: true,
  //     message: 'Audio created (mock)',
  //     severity: 'success',
  //   });
  // };

  // const filteredAudios = React.useMemo(() => {
  //   const q = search.trim().toLowerCase();
  //   if (!q) return audios;
  //   return audios.filter((a) => {
  //     const inTitle = a.title.toLowerCase().includes(q);
  //     const inArtist = (a.artist ?? '').toLowerCase().includes(q);
  //     const inTags = (a.tags ?? []).some((t) => t.toLowerCase().includes(q));
  //     return inTitle || inArtist || inTags;
  //   });
  // }, [audios, search]);

  // const pagedAudios = filteredAudios.slice(
  //   page * rowsPerPage,
  //   page * rowsPerPage + rowsPerPage,
  // );

  // React.useEffect(() => {
  //   // Reset page when filters change
  //   setPage(0);
  // }, [search]);

  // TODO: Replace mocks with Apollo Client
  // const { data, loading, refetch } = useQuery(GetAudiosDocument, { variables: { ... }});
  // const [deleteAudio] = useMutation(DeleteAudioDocument);
  // const [createAudio] = useMutation(CreateAudioDocument);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography variant="h5" fontWeight={700}>
            Audio Library
          </Typography>
          <Chip label={`${totalCount || audios.length} total`} size="small" />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void refresh()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            New Audio
          </Button>
        </Stack>
      </Stack>

      <Toolbar disableGutters sx={{ mb: 1 }}>
        <TextField
          size="small"
          placeholder="Search by title, artist, or tag"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setAfter(null);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 380, maxWidth: '100%' }}
        />
        <Box sx={{ flex: 1 }} />
        <Button
          color="error"
          startIcon={<DeleteOutlineIcon />}
          disabled={selected.length === 0}
          onClick={handleBulkDelete}
        >
          Delete selected ({selected.length})
        </Button>
      </Toolbar>

      <Divider sx={{ mb: 2 }} />

      <AudioTable
        rows={rows}
        loading={loading}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(nextRows) => {
          void handleRowsPerPageChange(nextRows);
        }}
        onPageChange={(newPage) => {
          void handleChangePage(newPage);
        }}
        onRefresh={() => {
          void refresh();
        }}
      />

      <UploadForm open={createOpen} onClose={() => setCreateOpen(false)} />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete audio"
        message={
          <Alert severity="warning" icon={false} sx={{ mb: 0 }}>
            You are about to delete {selected.length} audio file(s). This action
            cannot be undone.
          </Alert>
        }
        confirmText="Delete"
        confirmColor="error"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2200}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity || 'success'}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
