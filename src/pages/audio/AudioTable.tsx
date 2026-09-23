import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  Skeleton,
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
import { alpha, type Theme } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import {
  PlayArrowRounded as PlayArrowRoundedIcon,
  PauseRounded as PauseRoundedIcon,
  MusicNoteRounded as MusicNoteRoundedIcon,
  ErrorOutlineRounded as ErrorOutlineRoundedIcon,
  DeleteOutlineRounded as DeleteOutlineRoundedIcon,
  LibraryMusicOutlined as LibraryMusicOutlinedIcon,
  SearchOffRounded as SearchOffRoundedIcon,
  CloudUploadOutlined as CloudUploadOutlinedIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { MediasTrackStateChoices, TrackType } from '@graphql/graphql';
import { IN_PROGRESS_STATES, formatTime, isPlayable } from '@libs/tracks';

export type AudioTableProps = Readonly<{
  rows: TrackType[];
  loading: boolean;
  search: string;
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  currentId: string | null;
  playing: boolean;
  onPlay: (track: TrackType) => void;
  onDelete: (tracks: TrackType[]) => void;
  onUploadClick: () => void;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}>;

const bounce = keyframes`
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
`;

const PlayingBars: React.FC = () => (
  <Box
    aria-hidden
    sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 14 }}
  >
    {[0, 0.2, 0.4].map((delay) => (
      <Box
        key={delay}
        sx={{
          width: 3,
          height: '100%',
          borderRadius: 1,
          bgcolor: 'currentColor',
          transformOrigin: 'bottom',
          animation: `${bounce} 0.9s ease-in-out ${delay}s infinite`,
        }}
      />
    ))}
  </Box>
);

const STATE_COLOR: Record<
  MediasTrackStateChoices,
  'success' | 'info' | 'error' | 'default'
> = {
  READY: 'success',
  UPLOADING: 'info',
  PENDING: 'info',
  PROCESSING: 'info',
  FAILED: 'error',
  ARCHIVED: 'default',
};

const StateChip: React.FC<Readonly<{ state: MediasTrackStateChoices }>> = ({
  state,
}) => {
  const { t } = useTranslation('audio');
  const busy = IN_PROGRESS_STATES.includes(state);
  return (
    <Chip
      size="small"
      variant={state === 'READY' ? 'outlined' : 'filled'}
      color={STATE_COLOR[state] ?? 'default'}
      label={t(`states.${state}`, { defaultValue: state })}
      icon={
        busy ? (
          <CircularProgress size={10} thickness={6} color="inherit" />
        ) : undefined
      }
      sx={{
        fontWeight: 500,
        ...(busy && {
          bgcolor: (th) => alpha(th.palette.info.main, 0.12),
          color: 'info.dark',
        }),
        ...(state === 'FAILED' && {
          bgcolor: (th) => alpha(th.palette.error.main, 0.12),
          color: 'error.dark',
        }),
        '& .MuiChip-icon': { ml: 1 },
      }}
    />
  );
};

type TrackTileProps = Readonly<{
  track: TrackType;
  isCurrent: boolean;
  playing: boolean;
}>;

const getIdleIcon = ({ track, isCurrent, playing }: TrackTileProps) => {
  if (isCurrent && playing) return <PlayingBars />;
  if (isCurrent) return <PauseRoundedIcon fontSize="small" />;
  if (track.state === 'FAILED') {
    return <ErrorOutlineRoundedIcon fontSize="small" />;
  }
  if (IN_PROGRESS_STATES.includes(track.state)) {
    return <CircularProgress size={16} thickness={5} color="inherit" />;
  }
  return <MusicNoteRoundedIcon fontSize="small" />;
};

const getTileColors = (theme: Theme, isCurrent: boolean, failed: boolean) => {
  if (isCurrent) {
    return {
      color: theme.palette.primary.contrastText,
      bgcolor: theme.palette.primary.main,
    };
  }
  if (failed) {
    return {
      color: theme.palette.error.main,
      bgcolor: alpha(theme.palette.error.main, 0.1),
    };
  }
  return {
    color: theme.palette.primary.main,
    bgcolor: alpha(theme.palette.primary.main, 0.08),
  };
};

/** Artwork tile in the title cell: play/pause affordance, playing bars or state icon. */
const TrackTile: React.FC<TrackTileProps> = (props) => {
  const { track, isCurrent, playing } = props;
  const playable = isPlayable(track);
  const failed = track.state === 'FAILED';

  return (
    <Box
      className="track-tile"
      sx={(theme) => ({
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: 1.5,
        display: 'grid',
        placeItems: 'center',
        transition: 'all 150ms',
        ...getTileColors(theme, isCurrent, failed),
        '& .hover-icon': { display: 'none' },
        ...(playable && {
          'tr:hover &': {
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          },
          'tr:hover & .idle-icon': { display: 'none' },
          'tr:hover & .hover-icon': { display: 'grid' },
        }),
      })}
    >
      <Box className="idle-icon" sx={{ display: 'grid' }}>
        {getIdleIcon(props)}
      </Box>
      <Box className="hover-icon" sx={{ placeItems: 'center' }}>
        {isCurrent && playing ? (
          <PauseRoundedIcon fontSize="small" />
        ) : (
          <PlayArrowRoundedIcon fontSize="small" />
        )}
      </Box>
    </Box>
  );
};

const SKELETON_KEYS = Array.from({ length: 8 }, (_, n) => `skeleton-${n}`);

const hideBelow = (bp: 'sm' | 'md' | 'lg') => ({
  display: { xs: 'none', [bp]: 'table-cell' },
});

const EmptyState: React.FC<
  Readonly<{ search: string; onUploadClick: () => void }>
> = ({ search, onUploadClick }) => {
  const { t } = useTranslation('audio');
  const Icon = search ? SearchOffRoundedIcon : LibraryMusicOutlinedIcon;
  return (
    <Box sx={{ py: 8, px: 2, textAlign: 'center' }}>
      <Box
        sx={(theme) => ({
          width: 64,
          height: 64,
          mx: 'auto',
          mb: 2,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'primary.main',
          bgcolor: alpha(theme.palette.primary.main, 0.08),
        })}
      >
        <Icon fontSize="large" />
      </Box>
      <Typography variant="subtitle1" fontWeight={600}>
        {search ? t('noResultsTitle') : t('emptyTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {search ? t('noResultsBody', { query: search }) : t('emptyBody')}
      </Typography>
      {!search && (
        <Button
          variant="contained"
          startIcon={<CloudUploadOutlinedIcon />}
          onClick={onUploadClick}
          sx={{ mt: 2.5 }}
        >
          {t('newAudio')}
        </Button>
      )}
    </Box>
  );
};

export const AudioTable: React.FC<AudioTableProps> = ({
  rows,
  loading,
  search,
  selected,
  onSelectedChange,
  currentId,
  playing,
  onPlay,
  onDelete,
  onUploadClick,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const { t } = useTranslation('audio');
  const pageIds = rows.map((r) => r.id);
  const selectedOnPage = pageIds.filter((id) => selected.includes(id));
  const allSelected = rows.length > 0 && selectedOnPage.length === rows.length;

  const toggleAll = () =>
    onSelectedChange(
      allSelected
        ? selected.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...selected, ...pageIds])),
    );

  const toggleOne = (id: string) =>
    onSelectedChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );

  const showSkeleton = loading && rows.length === 0;

  if (!showSkeleton && rows.length === 0) {
    return <EmptyState search={search} onUploadClick={onUploadClick} />;
  }

  return (
    <>
      <TableContainer>
        <Table
          size="medium"
          sx={{
            '& th': {
              color: 'text.secondary',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              bgcolor: 'grey.50',
              whiteSpace: 'nowrap',
              py: 1.25,
            },
            '& td': { py: 1, borderColor: 'divider' },
            '& tr:last-of-type td': { borderBottom: 0 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={selectedOnPage.length > 0 && !allSelected}
                  onChange={toggleAll}
                  disabled={rows.length === 0}
                  slotProps={{ input: { 'aria-label': t('selectAll') } }}
                />
              </TableCell>
              <TableCell>{t('columns.title')}</TableCell>
              <TableCell sx={hideBelow('md')}>{t('columns.album')}</TableCell>
              <TableCell sx={hideBelow('lg')}>{t('columns.genre')}</TableCell>
              <TableCell sx={hideBelow('lg')}>{t('columns.added')}</TableCell>
              <TableCell align="right" sx={hideBelow('sm')}>
                {t('columns.duration')}
              </TableCell>
              <TableCell align="right" sx={hideBelow('lg')}>
                {t('columns.quality')}
              </TableCell>
              <TableCell sx={hideBelow('sm')}>{t('columns.status')}</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {showSkeleton
              ? SKELETON_KEYS.slice(0, rowsPerPage).map((key) => (
                  <TableRow key={key}>
                    <TableCell padding="checkbox">
                      <Skeleton
                        variant="rounded"
                        width={18}
                        height={18}
                        sx={{ mx: 'auto' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
                        <Skeleton variant="rounded" width={40} height={40} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton width="60%" />
                          <Skeleton width="35%" />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={hideBelow('md')}>
                      <Skeleton />
                    </TableCell>
                    <TableCell sx={hideBelow('lg')}>
                      <Skeleton />
                    </TableCell>
                    <TableCell sx={hideBelow('lg')}>
                      <Skeleton />
                    </TableCell>
                    <TableCell sx={hideBelow('sm')}>
                      <Skeleton />
                    </TableCell>
                    <TableCell sx={hideBelow('lg')}>
                      <Skeleton />
                    </TableCell>
                    <TableCell sx={hideBelow('sm')}>
                      <Skeleton width={64} />
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))
              : rows.map((r) => {
                  const isCurrent = r.id === currentId;
                  const isSelected = selected.includes(r.id);
                  const playable = isPlayable(r);
                  return (
                    <TableRow
                      key={r.id}
                      hover
                      selected={isSelected}
                      onClick={() => playable && onPlay(r)}
                      sx={(theme) => ({
                        cursor: playable ? 'pointer' : 'default',
                        ...(isCurrent && {
                          bgcolor: alpha(theme.palette.primary.main, 0.06),
                          boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`,
                        }),
                      })}
                    >
                      <TableCell
                        padding="checkbox"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onChange={() => toggleOne(r.id)}
                          slotProps={{ input: { 'aria-label': r.title } }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 0, width: '40%' }}>
                        <Tooltip
                          title={playable ? '' : t('notPlayable')}
                          placement="top-start"
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              minWidth: 0,
                            }}
                          >
                            <TrackTile
                              track={r}
                              isCurrent={isCurrent}
                              playing={playing}
                            />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                noWrap
                                title={r.title}
                                color={isCurrent ? 'primary' : 'text.primary'}
                              >
                                {r.title || '—'}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                component="div"
                              >
                                {r.artist || t('unknownArtist')}
                              </Typography>
                            </Box>
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ ...hideBelow('md'), maxWidth: 180 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                          title={r.album}
                        >
                          {r.album || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={hideBelow('lg')}>
                        {r.genre ? (
                          <Chip
                            size="small"
                            label={r.genre}
                            sx={{ bgcolor: 'grey.100', maxWidth: 140 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell
                        sx={{ ...hideBelow('lg'), whiteSpace: 'nowrap' }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {r.createdAt
                            ? dayjs(r.createdAt).format('MMM D, YYYY')
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          ...hideBelow('sm'),
                          fontVariantNumeric: 'tabular-nums',
                          color: 'text.secondary',
                        }}
                      >
                        {Number(r.durationSeconds) > 0
                          ? formatTime(Number(r.durationSeconds))
                          : '—'}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          ...hideBelow('lg'),
                          whiteSpace: 'nowrap',
                          color: 'text.secondary',
                        }}
                      >
                        {r.bitrateKbps ? `${r.bitrateKbps} kbps` : '—'}
                      </TableCell>
                      <TableCell sx={hideBelow('sm')}>
                        <StateChip state={r.state} />
                      </TableCell>
                      <TableCell
                        align="right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip title={t('delete')}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => onDelete([r])}
                              disabled={r.state === 'PROCESSING'}
                              sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'error.main' },
                              }}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={totalCount === 0 ? 0 : page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, p) => onPageChange(p)}
        onRowsPerPageChange={(e) =>
          onRowsPerPageChange(Number.parseInt(e.target.value, 10))
        }
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage={t('rowsPerPage')}
        labelDisplayedRows={({ from, to, count }) =>
          t('displayedRows', { from, to, count })
        }
        showFirstButton
        showLastButton
        sx={{ borderTop: 1, borderColor: 'divider' }}
      />
    </>
  );
};
