import { useEffect, useState } from 'react';
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
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  BlockOutlined as BlockOutlinedIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  EditOutlined as EditOutlinedIcon,
  LockResetOutlined as LockResetOutlinedIcon,
  LogoutOutlined as LogoutOutlinedIcon,
  MoreVert as MoreVertIcon,
  PersonAddAlt1Outlined as PersonAddIcon,
  SearchRounded as SearchRoundedIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  useSendPasswordResetMutation,
  useSetUserActiveMutation,
  useSignOutUserMutation,
  useUsersQuery,
} from '@graphql/hooks';
import { notifier } from '@libs/constants';
import { useAuth } from '@components/providers/AuthContext';
import {
  LinkResultDialog,
  type AccountLinkResult,
} from '@components/LinkResultDialog';
import ConfirmDialog from '../audio/ConfirmDialog';
import { EditUserDialog } from './EditUserDialog';
import { InviteUserDialog, type InviteOutcome } from './InviteUserDialog';
import type { ManagedUserRow, UserStatusValue } from './types';

const STATUSES: readonly UserStatusValue[] = ['ACTIVE', 'INVITED', 'DISABLED'];
const ALL = 'ALL';
type StatusFilter = UserStatusValue | typeof ALL;

const STATUS_COLOR: Record<UserStatusValue, 'success' | 'warning' | 'default'> =
  {
    ACTIVE: 'success',
    INVITED: 'warning',
    DISABLED: 'default',
  };

type ConfirmKind = 'disable' | 'enable' | 'signOut';
type PendingConfirm = { kind: ConfirmKind; user: ManagedUserRow };

const hideBelow = (bp: 'sm' | 'md') => ({
  display: { xs: 'none', [bp]: 'table-cell' },
});

const fullName = (user: ManagedUserRow) =>
  [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

const useDebounced = (value: string, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

type RowMenuProps = Readonly<{
  user: ManagedUserRow;
  isSelf: boolean;
  onEdit: () => void;
  onSendLink: () => void;
  onConfirm: (kind: ConfirmKind) => void;
}>;

const RowMenu = ({
  user,
  isSelf,
  onEdit,
  onSendLink,
  onConfirm,
}: RowMenuProps) => {
  const { t } = useTranslation('users');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const disabled = user.status === 'DISABLED';
  const pending = user.status === 'INVITED';
  const pick = (action: () => void) => () => {
    setAnchor(null);
    action();
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label={t('actions.label', { name: fullName(user) })}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
      >
        <MenuItem onClick={pick(onEdit)}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('actions.edit')}</ListItemText>
        </MenuItem>
        {!disabled && (
          <MenuItem onClick={pick(onSendLink)}>
            <ListItemIcon>
              <LockResetOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {pending ? t('actions.resendInvite') : t('actions.sendReset')}
            </ListItemText>
          </MenuItem>
        )}
        {!disabled && !pending && !isSelf && (
          <MenuItem onClick={pick(() => onConfirm('signOut'))}>
            <ListItemIcon>
              <LogoutOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('actions.signOut')}</ListItemText>
          </MenuItem>
        )}
        {!isSelf && disabled && (
          <MenuItem onClick={pick(() => onConfirm('enable'))}>
            <ListItemIcon>
              <CheckCircleOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('actions.enable')}</ListItemText>
          </MenuItem>
        )}
        {!isSelf && !disabled && (
          <MenuItem
            onClick={pick(() => onConfirm('disable'))}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <BlockOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('actions.disable')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

const StudiosCell = ({ user }: Readonly<{ user: ManagedUserRow }>) => {
  const { t } = useTranslation('users');
  if (user.isSuperuser) {
    return <Chip size="small" color="primary" label={t('superuser')} />;
  }
  if (user.studios.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('noStudios')}
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {user.studios.map((s) => (
        <Chip
          key={s.studioId}
          size="small"
          variant="outlined"
          label={`${s.displayName} · ${t(`settings:members.roles.${s.role}`)}`}
        />
      ))}
    </Stack>
  );
};

export default function UsersPage() {
  const { t, i18n } = useTranslation('users');
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim());
  const [status, setStatus] = useState<StatusFilter>(ALL);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUserRow | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [linkResult, setLinkResult] = useState<AccountLinkResult | null>(null);

  const { data, loading, error } = useUsersQuery({
    variables: {
      search: debouncedSearch || undefined,
      status: status === ALL ? undefined : status,
      limit: rowsPerPage,
      offset: page * rowsPerPage,
    },
    fetchPolicy: 'cache-and-network',
  });
  const [setUserActive, settingActive] = useSetUserActiveMutation({
    refetchQueries: ['Users'],
  });
  const [signOutUser, signingOut] = useSignOutUserMutation();
  const [sendPasswordReset] = useSendPasswordResetMutation();
  const busy = settingActive.loading || signingOut.loading;

  // A new search or filter starts from the first page.
  useEffect(() => setPage(0), [debouncedSearch, status]);

  const rows = data?.users.items ?? [];
  const totalCount = data?.users.totalCount ?? 0;

  const formatDate = (value: unknown) =>
    value ? new Date(String(value)).toLocaleString(i18n.language) : t('never');

  const handleSendLink = async (user: ManagedUserRow) => {
    try {
      const res = await sendPasswordReset({ variables: { userId: user.id } });
      const sent = res.data?.sendPasswordReset;
      if (!sent) return;
      setLinkResult({
        email: user.email,
        link: sent.link,
        purpose: sent.purpose,
        emailed: sent.emailed,
      });
    } catch (err) {
      notifier.error(errorText(err, t('actionFailed')));
    }
  };

  const handleInvited = ({ email, result }: InviteOutcome) => {
    setInviteOpen(false);
    if (result.inviteLink) {
      setLinkResult({
        email,
        link: result.inviteLink,
        purpose: 'INVITE',
        emailed: result.emailed,
      });
      return;
    }
    notifier.success(t('invite.addedExisting', { email }));
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, user } = confirm;
    try {
      if (kind === 'signOut') {
        await signOutUser({ variables: { userId: user.id } });
      } else {
        await setUserActive({
          variables: { userId: user.id, active: kind === 'enable' },
        });
      }
      notifier.success(t(`confirm.${kind}.done`, { name: fullName(user) }));
    } catch (err) {
      notifier.error(errorText(err, t('actionFailed')));
    } finally {
      setConfirm(null);
    }
  };

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
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setInviteOpen(true)}
          sx={{ flexShrink: 0 }}
        >
          {t('invite.open')}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <TextField
            size="small"
            placeholder={t('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <SearchRoundedIcon
                    fontSize="small"
                    sx={{ mr: 1, color: 'text.secondary' }}
                  />
                ),
              },
            }}
            sx={{ flex: 1, maxWidth: { md: 360 } }}
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={status}
            onChange={(_e, value: StatusFilter | null) =>
              value && setStatus(value)
            }
            sx={{ flexWrap: 'wrap' }}
          >
            <ToggleButton value={ALL}>{t('status.ALL')}</ToggleButton>
            {STATUSES.map((s) => (
              <ToggleButton key={s} value={s}>
                {t(`status.${s}`)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
        {loading && <LinearProgress sx={{ height: 2 }} />}

        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>{t('columns.user')}</TableCell>
                <TableCell sx={hideBelow('md')}>
                  {t('columns.studios')}
                </TableCell>
                <TableCell>{t('columns.status')}</TableCell>
                <TableCell sx={hideBelow('sm')}>
                  {t('columns.lastLogin')}
                </TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5}>
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
              {rows.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ maxWidth: 0, width: '40%' }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {fullName(user)}
                      {user.id === me?.id && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          ml={1}
                        >
                          {t('you')}
                        </Typography>
                      )}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      component="div"
                    >
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={hideBelow('md')}>
                    <StudiosCell user={user} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={STATUS_COLOR[user.status]}
                      label={t(`status.${user.status}`)}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      ...hideBelow('sm'),
                      whiteSpace: 'nowrap',
                      color: 'text.secondary',
                    }}
                  >
                    {formatDate(user.lastLogin)}
                  </TableCell>
                  <TableCell align="right">
                    <RowMenu
                      user={user}
                      isSelf={user.id === me?.id}
                      onEdit={() => setEditing(user)}
                      onSendLink={() => void handleSendLink(user)}
                      onConfirm={(kind) => setConfirm({ kind, user })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_e, next) => setPage(next)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage={t('rowsPerPage')}
        />
      </Paper>

      <InviteUserDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={handleInvited}
      />
      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
      <LinkResultDialog
        result={linkResult}
        onClose={() => setLinkResult(null)}
      />
      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm
            ? t(`confirm.${confirm.kind}.title`, {
                name: fullName(confirm.user),
              })
            : ''
        }
        message={confirm ? t(`confirm.${confirm.kind}.body`) : ''}
        confirmText={confirm ? t(`confirm.${confirm.kind}.action`) : ''}
        cancelText={t('cancel')}
        confirmColor={confirm?.kind === 'enable' ? 'primary' : 'error'}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={() => void runConfirm()}
      />
    </Container>
  );
}
