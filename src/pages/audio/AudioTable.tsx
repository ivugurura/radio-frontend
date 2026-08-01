import {
  Box,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeleteTrackMutation, useTracksQuery } from '@graphql/hooks';
import type { TracksQueryVariables, TrackType } from '@graphql/graphql';
import { AudioPlayer } from '@components/AudioPlayer';
import { STUDIO_ID } from '@libs/constants';

export type AudioTableProps = {
  paginate?: boolean;
};

function useDebounced<T>(value: T, delay = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function secondsToClock(n?: number | null) {
  if (!n || n <= 0) return '—';
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const AudioTable: React.FC<AudioTableProps> = () => {
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [after, setAfter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [current, setCurrent] = React.useState<TrackType | null>(null);
  const searchDebounced = useDebounced(search, 400);

  const variables = useMemo<TracksQueryVariables>(
    () => ({
      studioSlug: STUDIO_ID,
      search: searchDebounced || null,
      first: rowsPerPage,
      after,
    }),
    [STUDIO_ID, searchDebounced, rowsPerPage, after],
  );

  const { data, loading, refetch, fetchMore } = useTracksQuery({
    variables,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-and-network',
  });

  const [deleteTrack, { loading: deleting }] = useDeleteTrackMutation({
    onError: () => {},
  });

  const totalCount = data?.tracks?.totalCount ?? 0;
  const endCursor = data?.tracks?.pageInfo?.endCursor ?? null;
  const hasNextPage = data?.tracks?.pageInfo?.hasNextPage ?? false;

  const rows =
    data?.tracks?.edges
      ?.map((e) => e?.node)
      .filter((n): n is TrackType => !!n) ?? [];

  const handleChangePage = useCallback(
    (_: unknown, newPage: number) => {
      // Relay only provides forward pagination here; compute how many pages we advanced by.
      // We'll just sequentially move forward when requested.
      if (newPage === 0) {
        // jump to first: reset
        setAfter(null);
        refetch({ ...variables, after: null });
        return;
      }
      if (hasNextPage && endCursor) {
        setAfter(endCursor);
        fetchMore({ variables: { ...variables, after: endCursor } });
      }
    },
    [endCursor, hasNextPage, variables, fetchMore, refetch],
  );

  const handleChangeRowsPerPage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(e.target.value, 10));
      setAfter(null);
    },
    [],
  );

  const onDelete = useCallback(
    async (id: string) => {
      const confirm = window.confirm(
        'Delete this track and remove files from disk?',
      );
      if (!confirm) return;
      await deleteTrack({ variables: { trackId: id } });
      // Refetch from the start to keep UX simple; you can optimize with cache evict if desired
      setAfter(null);
      refetch({ ...variables, after: null });
    },
    [deleteTrack, refetch, variables],
  );

  const onRefresh = useCallback(() => {
    refetch(variables);
  }, [refetch, variables]);

  const handleEndPlay = () => {
    // Auto play next track when current ends
    if (!rows || rows.length === 0) return;
    if (!current) {
      setCurrent(rows[0] as TrackType);
      return;
    }
    const currentIndex = rows.findIndex((r) => r.id === current.id);
    if (currentIndex === -1 || currentIndex === rows.length - 1) {
      // not found or last track
      setCurrent(null);
      return;
    }
    setCurrent(rows[currentIndex + 1] as TrackType);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <AudioPlayer source={current} autoPlay onEnded={handleEndPlay} />
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Tracks</Typography>
        <TextField
          size="small"
          label="Search title…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setAfter(null);
          }}
          sx={{ minWidth: 260 }}
        />
        <Tooltip title="Refresh">
          <span>
            <IconButton onClick={onRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Artist</TableCell>
              <TableCell>Album</TableCell>
              <TableCell>Genre</TableCell>
              <TableCell align="right">Year</TableCell>
              <TableCell align="right">Dur</TableCell>
              <TableCell align="right">Kbps</TableCell>
              <TableCell>State</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows?.map((r) => (
              <TableRow
                key={r.id}
                hover
                sx={{
                  bgcolor: current?.id === r.id ? 'lightgray' : 'transparent',
                }}
              >
                <TableCell onClick={() => setCurrent(r as TrackType)}>
                  {r.title || '—'}
                </TableCell>
                <TableCell>{r.artist || '—'}</TableCell>
                <TableCell>{r.album || '—'}</TableCell>
                <TableCell>{r.genre || '—'}</TableCell>
                <TableCell align="right">{r.year ?? '—'}</TableCell>
                <TableCell align="right">
                  {secondsToClock(r.durationSeconds)}
                </TableCell>
                <TableCell align="right">{r.bitrateKbps ?? '—'}</TableCell>
                <TableCell>{r.state}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Delete">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => onDelete(r.id)}
                        disabled={deleting || r.state === 'PROCESSING'}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {rows?.length === 0 && (
              <TableRow>
                <TableCell colSpan={10}>
                  <Box
                    sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}
                  >
                    {loading ? 'Loading…' : 'No tracks'}
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={
          0 /* Using relay forward pagination; we reset page to 0 when after changes */
        }
        rowsPerPage={rowsPerPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelDisplayedRows={() =>
          hasNextPage
            ? `Showing ${rows?.length} of ${totalCount}+`
            : `Showing ${rows?.length} of ${totalCount}`
        }
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Paper>
  );
};
