import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { CountryCount } from '@graphql/graphql';
import { flagEmoji, useRegionNamer } from './countryNames';

type Props = {
  data: CountryCount[];
};

export const CountryList: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation('listeners');
  const regionName = useRegionNamer();

  const rows = useMemo(
    () =>
      data
        .filter((d) => d.count > 0)
        .map((d) => {
          const code = (d.code || '').toUpperCase();
          return {
            code,
            count: d.count,
            flag: flagEmoji(code),
            name: regionName(code) ?? t('unknownCountry'),
          };
        })
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    [data, regionName, t],
  );

  return (
    <Paper elevation={0} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: 'text.secondary', py: 1.5 }}>
              {t('country')}
            </TableCell>
            <TableCell align="right" sx={{ color: 'text.secondary', py: 1.5 }}>
              {t('listenersColumn')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} sx={{ borderBottom: 0 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('noListenersNow')}
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.code || 'unknown'}>
              <TableCell>
                {r.flag && (
                  <span aria-hidden style={{ marginRight: 8 }}>
                    {r.flag}
                  </span>
                )}
                {r.name}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {r.count}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};
