import React from 'react';
import { Box, Typography, LinearProgress, Link, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  HeadphonesOutlined,
  StorageOutlined,
  AddCircleOutline,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { StudioCapacity } from '@graphql/graphql';
import { DashboardCard } from './DashboardCard';

interface CapacityPanelProps {
  capacity: StudioCapacity | null;
}

type MeterColor = 'primary' | 'warning' | 'error';

const pct = (val: number, max: number) => {
  if (!max) return 0;
  return Math.min(100, (val / max) * 100);
};

const meterColor = (percent: number, base: MeterColor): MeterColor => {
  if (percent >= 95) return 'error';
  if (percent >= 80) return 'warning';
  return base;
};

const UsageMeter: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  percent: number;
}> = ({ icon: Icon, label, value, percent }) => {
  const { t } = useTranslation('dashboard');
  const color = meterColor(percent, 'primary');

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={1.25}>
        <Box
          sx={(theme) => ({
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            color: theme.palette[color].main,
            backgroundColor: alpha(theme.palette[color].main, 0.12),
          })}
        >
          <Icon fontSize="small" />
        </Box>
        <Box flex={1} minWidth={0}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {label}
          </Typography>
          <Typography
            variant="body1"
            fontWeight={700}
            noWrap
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          fontWeight={600}
          color="text.secondary"
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {t('capacity.percentUsed', { pct: percent.toFixed(0) })}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={color}
        sx={(theme) => ({
          height: 8,
          borderRadius: 4,
          backgroundColor: alpha(theme.palette.text.primary, 0.08),
          '& .MuiLinearProgress-bar': { borderRadius: 4 },
        })}
      />
    </Box>
  );
};

export const CapacityPanel: React.FC<CapacityPanelProps> = ({ capacity }) => {
  const { t } = useTranslation('dashboard');
  const listeningHours = capacity
    ? (capacity.listeningSeconds / 3600).toFixed(2)
    : '0.00';
  const listeningQuotaHours = capacity
    ? (capacity.listeningSecondsQuota / 3600).toFixed(0)
    : '0';
  const diskUsed = capacity ? capacity.diskUsedGb.toFixed(2) : '0';
  const diskQuota = capacity ? capacity.diskQuotaGb.toFixed(0) : '0';

  return (
    <DashboardCard title={t('capacity.title')}>
      <Stack spacing={3} flex={1}>
        <UsageMeter
          icon={HeadphonesOutlined}
          label={t('capacity.listeningTime')}
          value={t('capacity.hoursValue', {
            used: listeningHours,
            quota: listeningQuotaHours,
          })}
          percent={
            capacity
              ? pct(capacity.listeningSeconds, capacity.listeningSecondsQuota)
              : 0
          }
        />
        <UsageMeter
          icon={StorageOutlined}
          label={t('capacity.diskSpace')}
          value={t('capacity.gbValue', { used: diskUsed, quota: diskQuota })}
          percent={capacity ? pct(capacity.diskUsedGb, capacity.diskQuotaGb) : 0}
        />
      </Stack>
      <Link
        href="#"
        underline="hover"
        sx={{
          mt: 3,
          fontSize: 13,
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          alignSelf: 'flex-start',
        }}
      >
        <AddCircleOutline sx={{ fontSize: 16 }} />
        {t('capacity.buyStorage')}
      </Link>
    </DashboardCard>
  );
};
