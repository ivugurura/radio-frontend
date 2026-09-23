import React, { useMemo } from 'react';
import { Paper } from '@mui/material';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import type { CountryCount } from '@graphql/graphql';
import { NAME_TO_ALPHA2, NUMERIC_TO_ALPHA2 } from './countryCodes';

type Props = {
  data: CountryCount[];
  height?: number;
  title?: string;
};

const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export const WorldMap: React.FC<Props> = ({ data, height = 440 }) => {
  const max = useMemo(
    () => data.reduce((m, d) => Math.max(m, d.count), 0),
    [data],
  );
  const color = useMemo(
    () => scaleSequential(interpolateBlues).domain([0, Math.max(5, max)]),
    [max],
  );

  const byCode = useMemo(() => {
    const m = new Map<string, number>();
    data.forEach((d) => m.set((d.code || '').toUpperCase(), d.count));
    return m;
  }, [data]);

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
      <div style={{ width: '100%', height }}>
        <ComposableMap projectionConfig={{ scale: 145 }}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = (geo.properties as { name?: string }).name ?? '';
                const code =
                  NUMERIC_TO_ALPHA2[String(geo.id)] ||
                  NAME_TO_ALPHA2[name] ||
                  '';
                const cnt = byCode.get(code) || 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={cnt > 0 ? (color(cnt) as string) : '#e0e0e0'}
                    stroke="#fff"
                    strokeWidth={0.5}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
    </Paper>
  );
};
