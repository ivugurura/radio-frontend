import React from 'react';
import {
  Box,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  HeadphonesOutlined,
  StorageOutlined,
  MemoryOutlined,
  DeveloperBoardOutlined,
  SaveOutlined,
  SwapVertOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { StudioCapacity } from '@graphql/graphql';
import { DashboardCard } from './DashboardCard';

interface CapacityPanelProps {
  capacity: StudioCapacity | null;
}

type MeterColor = 'primary' | 'warning' | 'error';

// VPS the studios run on; quotas are derived from it in the API.
const SERVER_SPECS = {
  cpuCores: 2,
  memoryGb: 8,
  diskGb: 100,
  bandwidthTb: 8,
};

const HOURS_IN_30_DAYS = 30 * 24;

const pct = (val: number, max: number) => {
  if (!max) return 0;
  return Math.min(100, (val / max) * 100);
};

const meterColor = (percent: number, base: MeterColor): MeterColor => {
  if (percent >= 95) return 'error';
  if (percent >= 80) return 'warning';
  return base;
};

const formatNumber = (value: number, digits = 0) =>
  value.toLocaleString(undefined, { maximumFractionDigits: digits });

const UsageMeter: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  percent: number;
  caption: string;
}> = ({ icon: Icon, label, value, percent, caption }) => {
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
            color: (theme.vars || theme).palette[color].main,
            backgroundColor: theme.alpha(
              (theme.vars || theme).palette[color].main,
              0.12,
            ),
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
          backgroundColor: theme.alpha(
            (theme.vars || theme).palette.text.primary,
            0.08,
          ),
          '& .MuiLinearProgress-bar': { borderRadius: 4 },
        })}
      />
      <Typography variant="body2" color="text.secondary" mt={0.75}>
        {caption}
      </Typography>
    </Box>
  );
};

const SpecItem: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
}> = ({ icon: Icon, label, value }) => (
  <Stack
    direction="row"
    spacing={1}
    alignItems="center"
    sx={(theme) => ({
      p: 1,
      borderRadius: 2,
      minWidth: 0,
      backgroundColor: theme.alpha(
        (theme.vars || theme).palette.text.primary,
        0.03,
      ),
    })}
  >
    <Icon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
    <Box minWidth={0}>
      <Typography variant="body2" color="text.secondary" noWrap>
        {label}
      </Typography>
      <Typography variant="body1" fontWeight={600} noWrap>
        {value}
      </Typography>
    </Box>
  </Stack>
);

export const CapacityPanel: React.FC<CapacityPanelProps> = ({ capacity }) => {
  const { t } = useTranslation('dashboard');
  const usedHours = capacity ? capacity.listeningSeconds / 3600 : 0;
  const quotaHours = capacity ? capacity.listeningSecondsQuota / 3600 : 0;
  const diskUsedGb = capacity?.diskUsedGb ?? 0;
  const diskQuotaGb = capacity?.diskQuotaGb ?? 0;
  const roundTheClockListeners = Math.floor(quotaHours / HOURS_IN_30_DAYS);

  const specs = [
    {
      key: 'cpu',
      icon: DeveloperBoardOutlined,
      value: t('capacity.server.cpuValue', { count: SERVER_SPECS.cpuCores }),
    },
    {
      key: 'memory',
      icon: MemoryOutlined,
      value: `${SERVER_SPECS.memoryGb} GB`,
    },
    {
      key: 'disk',
      icon: SaveOutlined,
      value: `${SERVER_SPECS.diskGb} GB`,
    },
    {
      key: 'bandwidth',
      icon: SwapVertOutlined,
      value: t('capacity.server.bandwidthValue', {
        value: SERVER_SPECS.bandwidthTb,
      }),
    },
  ];

  return (
    <DashboardCard
      title={t('capacity.title')}
      subtitle={t('capacity.subtitle')}
    >
      <Stack spacing={2.5}>
        <UsageMeter
          icon={HeadphonesOutlined}
          label={t('capacity.listeningTime')}
          value={t('capacity.hoursValue', {
            used: formatNumber(usedHours, 1),
            quota: formatNumber(quotaHours),
          })}
          percent={pct(usedHours, quotaHours)}
          caption={t('capacity.hoursLeft', {
            value: formatNumber(Math.max(0, quotaHours - usedHours)),
            count: roundTheClockListeners,
          })}
        />
        <UsageMeter
          icon={StorageOutlined}
          label={t('capacity.diskSpace')}
          value={t('capacity.gbValue', {
            used: diskUsedGb.toFixed(2),
            quota: diskQuotaGb.toFixed(0),
          })}
          percent={pct(diskUsedGb, diskQuotaGb)}
          caption={t('capacity.gbFree', {
            value: formatNumber(Math.max(0, diskQuotaGb - diskUsedGb), 1),
          })}
        />
      </Stack>

      <Divider sx={{ my: 2.5 }} />

      <Typography
        variant="body2"
        fontWeight={600}
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}
      >
        {t('capacity.server.title')}
      </Typography>
      <Grid container spacing={1}>
        {specs.map((spec) => (
          <Grid key={spec.key} size={6}>
            <SpecItem
              icon={spec.icon}
              label={t(`capacity.server.${spec.key}`)}
              value={spec.value}
            />
          </Grid>
        ))}
      </Grid>
    </DashboardCard>
  );
};
