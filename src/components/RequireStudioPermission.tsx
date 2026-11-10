import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import {
  BlockOutlined as BlockOutlinedIcon,
  PersonOffOutlined as PersonOffOutlinedIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useStudioAccess, type StudioPermission } from './providers';
import { useAuth } from './providers/AuthContext';

type NoticeKind = 'noStudio' | 'forbidden';

const NOTICE_ICONS: Record<NoticeKind, React.ElementType> = {
  noStudio: PersonOffOutlinedIcon,
  forbidden: BlockOutlinedIcon,
};

/** Where the notice's button leads: settings is always reachable. */
const NOTICE_LINKS: Record<NoticeKind, { to: string; label: string }> = {
  noStudio: { to: '/admin/settings', label: 'access.openSettings' },
  forbidden: { to: '/admin', label: 'access.backToDashboard' },
};

export const AccessNotice: React.FC<Readonly<{ kind: NoticeKind }>> = ({
  kind,
}) => {
  const { t } = useTranslation('layout');
  const Icon = NOTICE_ICONS[kind];
  const link = NOTICE_LINKS[kind];
  return (
    <Paper
      variant="outlined"
      sx={{
        maxWidth: 520,
        mx: 'auto',
        mt: { xs: 2, sm: 6 },
        p: 4,
        borderRadius: 3,
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Icon color="disabled" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h6" fontWeight={600}>
          {t(`access.${kind}Title`)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t(`access.${kind}Body`)}
        </Typography>
        <Button component={Link} to={link.to} variant="outlined" sx={{ mt: 3 }}>
          {t(link.label)}
        </Button>
      </Box>
    </Paper>
  );
};

/**
 * Renders a staff page only when the user may open it in the active studio.
 * The API enforces the same rule; this avoids showing a page of errors.
 */
export const RequireStudioPermission: React.FC<
  Readonly<{ permission: StudioPermission; children: React.ReactNode }>
> = ({ permission, children }) => {
  const access = useStudioAccess();
  if (!access.current) return <AccessNotice kind="noStudio" />;
  if (!access.can(permission)) return <AccessNotice kind="forbidden" />;
  return <>{children}</>;
};

/** Platform-admin pages (e.g. user management). */
export const RequireSuperuser: React.FC<
  Readonly<{ children: React.ReactNode }>
> = ({ children }) => {
  const { user } = useAuth();
  if (!user?.isSuperuser) return <AccessNotice kind="forbidden" />;
  return <>{children}</>;
};
