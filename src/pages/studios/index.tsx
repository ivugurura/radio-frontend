import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AddRounded as AddIcon,
  BlockOutlined as BlockOutlinedIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  MoreVert as MoreVertIcon,
  SettingsOutlined as SettingsOutlinedIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSetStudioActiveMutation, useStudiosQuery } from '@graphql/hooks';
import type { StudiosQuery } from '@graphql/graphql';
import { notifier } from '@libs/constants';
import { useLanguage } from '@components/providers';
import { isSupportedLanguage } from '../../i18n/config';
import ConfirmDialog from '../audio/ConfirmDialog';
import { CreateStudioDialog } from './CreateStudioDialog';
import { waitForStudioOnAir } from './onAir';
import { studioLanguageLabel } from './labels';

type StudioRow = StudiosQuery['studios'][number];
type ConfirmKind = 'deactivate' | 'activate';
type PendingConfirm = { kind: ConfirmKind; studio: StudioRow };

const hideBelow = (bp: 'sm' | 'md') => ({
  display: { xs: 'none', [bp]: 'table-cell' },
});

type ChipColor = 'success' | 'warning' | 'default';

const statusChip = (
  studio: StudioRow,
  switching: boolean,
): { color: ChipColor; key: string } => {
  if (switching) return { color: 'warning', key: 'applied.checking' };
  if (studio.isActive) return { color: 'success', key: 'status.active' };
  return { color: 'default', key: 'status.inactive' };
};

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

type RowMenuProps = Readonly<{
  studio: StudioRow;
  isLastActive: boolean;
  onOpenSettings: () => void;
  onConfirm: (kind: ConfirmKind) => void;
}>;

const RowMenu = ({
  studio,
  isLastActive,
  onOpenSettings,
  onConfirm,
}: RowMenuProps) => {
  const { t } = useTranslation('studios');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const pick = (action: () => void) => () => {
    setAnchor(null);
    action();
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label={t('actions.label', { name: studio.displayName })}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
      >
        {studio.isActive && (
          <MenuItem onClick={pick(onOpenSettings)}>
            <ListItemIcon>
              <SettingsOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('actions.openSettings')}</ListItemText>
          </MenuItem>
        )}
        {!studio.isActive && (
          <MenuItem onClick={pick(() => onConfirm('activate'))}>
            <ListItemIcon>
              <CheckCircleOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('actions.activate')}</ListItemText>
          </MenuItem>
        )}
        {studio.isActive && (
          <MenuItem
            onClick={pick(() => onConfirm('deactivate'))}
            disabled={isLastActive}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <BlockOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              secondary={isLastActive ? t('actions.lastActive') : undefined}
            >
              {t('actions.deactivate')}
            </ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

const StatusChip = ({
  chip,
}: Readonly<{ chip: ReturnType<typeof statusChip> }>) => {
  const { t } = useTranslation('studios');
  return <Chip size="small" color={chip.color} label={t(chip.key)} />;
};

export default function StudiosPage() {
  const { t, i18n } = useTranslation('studios');
  const navigate = useNavigate();
  const { setLanguage } = useLanguage();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  // Studios whose change radio-studio hasn't applied yet.
  const [switching, setSwitching] = useState<ReadonlySet<string>>(new Set());

  const { data, loading, error } = useStudiosQuery({
    fetchPolicy: 'cache-and-network',
  });
  const [setStudioActive, { loading: busy }] = useSetStudioActiveMutation({
    refetchQueries: ['Studios', 'PublicStudios', 'UserProfile'],
  });

  const rows = data?.studios ?? [];
  const availableSlugs = data?.availableStudioSlugs ?? [];
  const activeCount = rows.filter((s) => s.isActive).length;
  const canCreate = availableSlugs.length > 0;

  const formatDate = (value: unknown) =>
    value ? new Date(String(value)).toLocaleDateString(i18n.language) : '';

  const formatAudio = (studio: StudioRow) =>
    t('audio', {
      kbps: studio.bitrateKbps,
      khz: studio.sampleRateHz / 1000,
      channels: studio.channels,
    });

  // A studio is opened by switching to its language (language decides the
  // studio), then its own settings page takes over.
  const openSettings = (studio: StudioRow) => {
    if (isSupportedLanguage(studio.studioId)) setLanguage(studio.studioId);
    navigate('/admin/settings');
  };

  const markSwitching = (studioId: string, on: boolean) =>
    setSwitching((prev) => {
      const next = new Set(prev);
      if (on) next.add(studioId);
      else next.delete(studioId);
      return next;
    });

  // The backend asks radio-studio to apply a change at once; confirm it by
  // watching the stream server itself rather than trusting the request.
  // Resolves whether it went on (or off) air in time.
  const watchOnAir = async (studioId: string, onAir: boolean) => {
    markSwitching(studioId, true);
    try {
      return await waitForStudioOnAir(studioId, onAir);
    } finally {
      markSwitching(studioId, false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, studio } = confirm;
    const activate = kind === 'activate';
    const name = studio.displayName;
    try {
      await setStudioActive({
        variables: { studioId: studio.studioId, active: activate },
      });
    } catch (err) {
      notifier.error(errorText(err, t('actionFailed')));
      setConfirm(null);
      return;
    }
    setConfirm(null);
    const applied = await watchOnAir(studio.studioId, activate);
    if (applied) {
      notifier.success(t(`confirm.${kind}.done`, { name }));
      return;
    }
    notifier.info(t(`confirm.${kind}.pending`, { name }));
  };

  const handleCreated = async (studioId: string, name: string) => {
    setCreateOpen(false);
    if (await watchOnAir(studioId, true)) {
      notifier.success(t('create.done', { name }));
      return;
    }
    notifier.info(t('create.pending', { name }));
  };

  const createButton = (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={() => setCreateOpen(true)}
      disabled={!canCreate}
      sx={{ flexShrink: 0 }}
    >
      {t('create.open')}
    </Button>
  );

  return (
    <Container
      maxWidth="xl"
      sx={{ py: { xs: 2, sm: 3 }, px: { xs: 0, sm: 3 } }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        spacing={2}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('intro')}
          </Typography>
        </Box>
        {canCreate && createButton}
        {!canCreate && !loading && (
          <Tooltip title={t('create.noneAvailable')}>
            {/* A disabled button fires no events; the span carries the tooltip. */}
            <span>{createButton}</span>
          </Tooltip>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {loading && <LinearProgress sx={{ height: 2 }} />}
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>{t('columns.studio')}</TableCell>
                <TableCell>{t('columns.status')}</TableCell>
                <TableCell align="right" sx={hideBelow('sm')}>
                  {t('columns.members')}
                </TableCell>
                <TableCell align="right" sx={hideBelow('sm')}>
                  {t('columns.tracks')}
                </TableCell>
                <TableCell sx={hideBelow('md')}>{t('columns.audio')}</TableCell>
                <TableCell sx={hideBelow('md')}>
                  {t('columns.created')}
                </TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                      py={4}
                    >
                      {t('empty')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((studio) => (
                <TableRow key={studio.studioId} hover>
                  <TableCell sx={{ maxWidth: 0, width: '35%' }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {studio.displayName}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      component="div"
                    >
                      {studioLanguageLabel(studio.studioId)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip
                      chip={statusChip(studio, switching.has(studio.studioId))}
                    />
                  </TableCell>
                  <TableCell align="right" sx={hideBelow('sm')}>
                    {studio.memberCount}
                  </TableCell>
                  <TableCell align="right" sx={hideBelow('sm')}>
                    {studio.trackCount}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...hideBelow('md'),
                      whiteSpace: 'nowrap',
                      color: 'text.secondary',
                    }}
                  >
                    {formatAudio(studio)}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...hideBelow('md'),
                      whiteSpace: 'nowrap',
                      color: 'text.secondary',
                    }}
                  >
                    {formatDate(studio.createdAt)}
                  </TableCell>
                  <TableCell align="right">
                    <RowMenu
                      studio={studio}
                      isLastActive={studio.isActive && activeCount <= 1}
                      onOpenSettings={() => openSettings(studio)}
                      onConfirm={(kind) => setConfirm({ kind, studio })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <CreateStudioDialog
        open={createOpen}
        availableSlugs={availableSlugs}
        onClose={() => setCreateOpen(false)}
        onCreated={(studioId, name) => void handleCreated(studioId, name)}
      />
      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm
            ? t(`confirm.${confirm.kind}.title`, {
                name: confirm.studio.displayName,
              })
            : ''
        }
        message={confirm ? t(`confirm.${confirm.kind}.body`) : ''}
        confirmText={confirm ? t(`confirm.${confirm.kind}.action`) : ''}
        cancelText={t('cancel')}
        confirmColor={confirm?.kind === 'activate' ? 'primary' : 'error'}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={() => void runConfirm()}
      />
    </Container>
  );
}
