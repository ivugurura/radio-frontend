import React, { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { PersonRemoveOutlined as PersonRemoveOutlinedIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  useInviteUserMutation,
  useRemoveStudioMemberMutation,
  useStudioMembersQuery,
  useUpdateStudioMemberRoleMutation,
} from '@graphql/hooks';
import type { StudioMembersQuery } from '@graphql/graphql';
import { notifier } from '@libs/constants';
import {
  useStudioAccess,
  useStudioId,
  type StudioRole,
} from '@components/providers';
import { useAuth } from '@components/providers/AuthContext';
import {
  LinkResultDialog,
  type AccountLinkResult,
} from '@components/LinkResultDialog';
import ConfirmDialog from '../audio/ConfirmDialog';
import { SettingsCard } from './SettingsCard';
import { errorMessage } from './errors';

type Member = StudioMembersQuery['studioMembers'][number];

const REFETCH = {
  refetchQueries: ['StudioMembers'],
  awaitRefetchQueries: true,
};

const fullName = (member: Member) =>
  [member.user.firstName, member.user.lastName].filter(Boolean).join(' ') ||
  member.user.email;

const initials = (member: Member) =>
  fullName(member)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

type RoleSelectProps = Readonly<{
  label: string;
  value: StudioRole | '';
  roles: readonly StudioRole[];
  disabled?: boolean;
  onChange: (role: StudioRole) => void;
}>;

const RoleSelect = ({
  label,
  value,
  roles,
  disabled,
  onChange,
}: RoleSelectProps) => {
  const { t } = useTranslation('settings');
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as StudioRole)}
      sx={{ minWidth: 150 }}
      slotProps={{
        select: {
          renderValue: (selected) =>
            t(`members.roles.${selected as StudioRole}`),
        },
      }}
    >
      {roles.map((role) => (
        <MenuItem key={role} value={role} sx={{ display: 'block' }}>
          <Typography variant="body2" fontWeight={600}>
            {t(`members.roles.${role}`)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t(`members.roleHints.${role}`)}
          </Typography>
        </MenuItem>
      ))}
    </TextField>
  );
};

const EMPTY_INVITE = { email: '', firstName: '', lastName: '' };

/**
 * Invites by email. An existing account joins the studio at once; a new one
 * gets a one-time link (emailed when the server can, always shown to copy).
 */
const InviteMemberForm = ({
  roles,
}: Readonly<{ roles: readonly StudioRole[] }>) => {
  const { t } = useTranslation('settings');
  const studioId = useStudioId();
  const [form, setForm] = useState(EMPTY_INVITE);
  const [role, setRole] = useState<StudioRole | ''>('');
  const [linkResult, setLinkResult] = useState<AccountLinkResult | null>(null);
  const [inviteUser, { loading }] = useInviteUserMutation(REFETCH);

  const field =
    (key: keyof typeof EMPTY_INVITE) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    const email = form.email.trim();
    try {
      const res = await inviteUser({
        variables: {
          studioId,
          email,
          role,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        },
      });
      const result = res.data?.inviteUser;
      if (!result) return;
      setForm(EMPTY_INVITE);
      setRole('');
      if (result.inviteLink) {
        setLinkResult({
          email,
          link: result.inviteLink,
          purpose: 'INVITE',
          emailed: result.emailed,
        });
        return;
      }
      notifier.success(
        t('members.added', { email, role: t(`members.roles.${role}`) }),
      );
    } catch (err) {
      notifier.error(errorMessage(err, t('members.actionFailed')));
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            type="email"
            label={t('members.email')}
            value={form.email}
            onChange={field('email')}
            autoComplete="off"
            fullWidth
          />
          <RoleSelect
            label={t('members.role')}
            value={role}
            roles={roles}
            onChange={setRole}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            label={t('members.firstName')}
            value={form.firstName}
            onChange={field('firstName')}
            fullWidth
          />
          <TextField
            size="small"
            label={t('members.lastName')}
            value={form.lastName}
            onChange={field('lastName')}
            fullWidth
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !form.email.trim() || !role}
            sx={{ flexShrink: 0 }}
          >
            {loading ? t('members.adding') : t('members.add')}
          </Button>
        </Stack>
      </Stack>
      <Typography variant="caption" color="text.secondary" component="p" mt={1}>
        {t('members.addHint')}
      </Typography>
      <LinkResultDialog
        result={linkResult}
        onClose={() => setLinkResult(null)}
      />
    </Box>
  );
};

type MemberRowProps = Readonly<{
  member: Member;
  isSelf: boolean;
  roles: readonly StudioRole[];
  onRemove: (member: Member) => void;
}>;

const MemberRole = ({
  member,
  roles,
}: Readonly<{ member: Member; roles: readonly StudioRole[] }>) => {
  const { t } = useTranslation('settings');
  const studioId = useStudioId();
  const [updateRole, { loading }] = useUpdateStudioMemberRoleMutation(REFETCH);

  if (!member.canManage) {
    return <Chip size="small" label={t(`members.roles.${member.role}`)} />;
  }

  const handleChange = async (role: StudioRole) => {
    if (role === member.role) return;
    try {
      await updateRole({
        variables: { studioId, userId: member.user.id, role },
      });
      notifier.success(t('members.roleChanged', { name: fullName(member) }));
    } catch (err) {
      notifier.error(errorMessage(err, t('members.actionFailed')));
    }
  };

  return (
    <RoleSelect
      label={t('members.role')}
      value={member.role}
      roles={roles}
      disabled={loading}
      onChange={(role) => void handleChange(role)}
    />
  );
};

const MemberRow = ({ member, isSelf, roles, onRemove }: MemberRowProps) => {
  const { t } = useTranslation('settings');
  return (
    <ListItem divider sx={{ px: 0, py: 1.5 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ width: '100%', minWidth: 0 }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ flex: 1, minWidth: 0 }}
        >
          <Avatar sx={{ width: 36, height: 36, fontSize: 14 }}>
            {initials(member)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {fullName(member)}
              {isSelf && (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  ml={1}
                >
                  {t('members.you')}
                </Typography>
              )}
              {member.user.isPending && (
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={t('members.pending')}
                  sx={{ ml: 1, height: 20 }}
                />
              )}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              component="div"
            >
              {member.user.email}
            </Typography>
          </Box>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="flex-end"
        >
          <MemberRole member={member} roles={roles} />
          {member.canManage && (
            <Tooltip title={t('members.remove')}>
              <IconButton
                size="small"
                onClick={() => onRemove(member)}
                aria-label={t('members.remove')}
                sx={{ '&:hover': { color: 'error.main' } }}
              >
                <PersonRemoveOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </ListItem>
  );
};

const MembersList = ({
  members,
  roles,
}: Readonly<{ members: Member[]; roles: readonly StudioRole[] }>) => {
  const { t } = useTranslation('settings');
  const studioId = useStudioId();
  const { user } = useAuth();
  const [pendingRemove, setPendingRemove] = useState<Member | null>(null);
  const [removeMember, { loading: removing }] =
    useRemoveStudioMemberMutation(REFETCH);

  if (members.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('members.empty')}
      </Typography>
    );
  }

  const confirmRemove = async () => {
    const target = pendingRemove;
    if (!target) return;
    try {
      await removeMember({ variables: { studioId, userId: target.user.id } });
      notifier.success(t('members.removed', { name: fullName(target) }));
    } catch (err) {
      notifier.error(errorMessage(err, t('members.actionFailed')));
    } finally {
      setPendingRemove(null);
    }
  };

  return (
    <>
      <List disablePadding>
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isSelf={member.user.id === user?.id}
            roles={roles}
            onRemove={setPendingRemove}
          />
        ))}
      </List>
      <ConfirmDialog
        open={pendingRemove !== null}
        title={t('members.removeConfirmTitle', {
          name: pendingRemove ? fullName(pendingRemove) : '',
        })}
        message={t('members.removeConfirmBody')}
        confirmText={t('members.removeConfirmAction')}
        cancelText={t('members.cancel')}
        onClose={() => !removing && setPendingRemove(null)}
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
};

export const MembersSection = () => {
  const { t } = useTranslation('settings');
  const studioId = useStudioId();
  const { current, assignableRoles } = useStudioAccess();
  const { data, loading, error } = useStudioMembersQuery({
    variables: { studioId },
    fetchPolicy: 'cache-and-network',
  });
  const members = data?.studioMembers;
  const studioName = current?.displayName ?? studioId;

  const renderMembers = () => {
    if (loading && !members) {
      return (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      );
    }
    if (error || !members) {
      return <Alert severity="error">{t('members.loadFailed')}</Alert>;
    }
    return <MembersList members={members} roles={assignableRoles} />;
  };

  return (
    <Stack spacing={2}>
      <SettingsCard
        title={t('members.addTitle')}
        subtitle={t('members.addSubtitle', { studio: studioName })}
      >
        <InviteMemberForm roles={assignableRoles} />
      </SettingsCard>
      <SettingsCard
        title={t('members.title')}
        subtitle={t('members.subtitle', { studio: studioName })}
      >
        {renderMembers()}
      </SettingsCard>
    </Stack>
  );
};
