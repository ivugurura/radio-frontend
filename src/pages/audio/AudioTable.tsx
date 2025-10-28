import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { Audio } from './types';

export type AudioTableProps = {
  rows: Audio[];
  loading?: boolean;
  page: number;
  rowsPerPage: number;
  total: number;
  selectedIds: string[];
  onChangePage: (page: number) => void;
  onChangeRowsPerPage: (rpp: number) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onDeleteOne: (id: string) => void;
  emptyMessage?: string;
};

function formatDuration(seconds?: number) {
  if (!seconds && seconds !== 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  } catch {
    return '—';
  }
}

export default function AudioTable({
  rows,
  loading = false,
  page,
  rowsPerPage,
  total,
  selectedIds,
  onChangePage,
  onChangeRowsPerPage,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteOne,
  emptyMessage = 'No audio files found',
}: AudioTableProps) {
  const allVisibleIds = rows.map((r) => r.id);
  const allVisibleSelected =
    allVisibleIds.every((id) => selectedIds.includes(id)) &&
    allVisibleIds.length > 0;
  const someVisibleSelected =
    allVisibleIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;

  return (
    <Box>
      <TableContainer>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someVisibleSelected}
                  checked={allVisibleSelected}
                  onChange={(e) => onToggleSelectAll(e.target.checked)}
                  inputProps={{ 'aria-label': 'select all visible' }}
                />
              </TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Artist</TableCell>
              <TableCell align="right">Duration</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              Array.from({ length: rowsPerPage }).map((_, idx) => (
                <TableRow key={`skeleton-${idx}`}>
                  <TableCell padding="checkbox">
                    <Skeleton variant="rectangular" width={18} height={18} />
                  </TableCell>
                  <TableCell colSpan={7}>
                    <Skeleton height={24} />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {emptyMessage}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const isSelected = selectedIds.includes(row.id);
                return (
                  <TableRow key={row.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => onToggleSelect(row.id)}
                        inputProps={{ 'aria-label': `select ${row.title}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <IconButton size="small" aria-label="play preview">
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {row.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {row.id}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{row.artist || '—'}</TableCell>
                    <TableCell align="right">
                      {formatDuration(row.durationSec)}
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {(row.tags ?? []).length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        ) : (
                          row.tags!.map((t) => (
                            <Chip key={t} size="small" label={t} />
                          ))
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell>
                      {row.status === 'ready' ? (
                        <Chip
                          label="Ready"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      ) : row.status === 'processing' ? (
                        <Chip
                          label="Processing"
                          color="warning"
                          size="small"
                          variant="outlined"
                        />
                      ) : row.status === 'failed' ? (
                        <Chip
                          label="Failed"
                          color="error"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Chip label="Unknown" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Delete">
                        <IconButton onClick={() => onDeleteOne(row.id)}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="More">
                        <IconButton>
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => onChangePage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) =>
          onChangeRowsPerPage(parseInt(e.target.value, 10))
        }
        showFirstButton
        showLastButton
      />
    </Box>
  );
}
