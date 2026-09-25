import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, IconButton, Paper, Tooltip } from '@mui/material';
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded';
import FullscreenExitRoundedIcon from '@mui/icons-material/FullscreenExitRounded';
import CenterFocusStrongRoundedIcon from '@mui/icons-material/CenterFocusStrongRounded';
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip as LeafletTooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import { geoArea, geoBounds, geoCentroid } from 'd3-geo';
import { interpolateBlues } from 'd3-scale-chromatic';
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
} from 'geojson';
import type { CountryCount } from '@graphql/graphql';
import { NAME_TO_ALPHA2, NUMERIC_TO_ALPHA2 } from './countryCodes';
import { flagEmoji, useRegionNamer } from './countryNames';

type Props = {
  data: CountryCount[];
  height?: number | string;
};

type CountryProps = { name?: string };
type CountryFeature = Feature<Geometry, CountryProps>;

type CountryShape = {
  code: string;
  feature: CountryFeature;
  // Centroid and bounds of the country's largest polygon, so overseas
  // territories (e.g. French Guiana) don't drag the marker into the ocean.
  center: L.LatLngTuple;
  bounds: L.LatLngBoundsExpression;
};

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';

// OpenStreetMap's standard tiles: free, no API key. Fine for a low-traffic
// staff page; see https://operations.osmfoundation.org/policies/tiles/
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TILE_MAX_ZOOM = 19;

const WORLD_CENTER: L.LatLngTuple = [15, 15];
const WORLD_ZOOM = 2;
const FOCUS_MAX_ZOOM = 6;

const largestPolygon = (geometry: Geometry): Polygon | MultiPolygon => {
  if (geometry.type !== 'MultiPolygon') return geometry as Polygon;
  let best: Polygon = { type: 'Polygon', coordinates: [] };
  let bestArea = -1;
  geometry.coordinates.forEach((coordinates) => {
    const poly: Polygon = { type: 'Polygon', coordinates };
    const area = geoArea(poly);
    if (area > bestArea) {
      bestArea = area;
      best = poly;
    }
  });
  return best;
};

const toShape = (f: CountryFeature): CountryShape | null => {
  const code =
    NUMERIC_TO_ALPHA2[String(f.id)] || NAME_TO_ALPHA2[f.properties?.name ?? ''];
  if (!code || !f.geometry) return null;
  const main = largestPolygon(f.geometry);
  const [lng, lat] = geoCentroid(main);
  const [[w, s], [e, n]] = geoBounds(main);
  return {
    code,
    feature: f,
    center: [lat, lng],
    bounds: [
      [s, w],
      [n, e],
    ],
  };
};

// Shared across mounts so switching pages doesn't re-download the atlas.
let shapesPromise: Promise<Map<string, CountryShape>> | null = null;
const loadShapes = () => {
  if (!shapesPromise) {
    shapesPromise = fetch(GEO_URL)
      .then((r) => r.json() as Promise<Topology>)
      .then((topo) => {
        const fc = feature(topo, topo.objects.countries) as FeatureCollection<
          Geometry,
          CountryProps
        >;
        const shapes = new Map<string, CountryShape>();
        fc.features.forEach((f) => {
          const shape = toShape(f);
          if (shape) shapes.set(shape.code, shape);
        });
        return shapes;
      })
      .catch((err) => {
        shapesPromise = null;
        throw err;
      });
  }
  return shapesPromise;
};

const useCountryShapes = () => {
  const [shapes, setShapes] = useState<Map<string, CountryShape> | null>(null);
  useEffect(() => {
    let alive = true;
    loadShapes()
      .then((s) => alive && setShapes(s))
      .catch(() => alive && setShapes(new Map()));
    return () => {
      alive = false;
    };
  }, []);
  return shapes;
};

const countBadge = (count: number, color: string) => {
  const size = Math.min(52, 26 + String(count).length * 7);
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font:600 13px/1 Roboto,Helvetica,Arial,sans-serif;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)">${count}</div>`,
  });
};

/** Zooms to the countries with listeners whenever that set changes. */
const FitToListeners: React.FC<{
  bounds: L.LatLngBounds | null;
  signature: string;
  resetTick: number;
}> = ({ bounds, signature, resetTick }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.flyToBounds(bounds, {
        padding: [48, 48],
        maxZoom: FOCUS_MAX_ZOOM,
        duration: 0.8,
      });
      return;
    }
    map.setView(WORLD_CENTER, WORLD_ZOOM);
    // Keyed on `signature` (not `bounds`) so a poll with the same countries
    // doesn't undo the user's panning.
  }, [map, signature, resetTick]);
  return null;
};

/** Leaflet needs a size recalculation after entering/leaving fullscreen. */
const InvalidateOnResize: React.FC<{ tick: boolean }> = ({ tick }) => {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(id);
  }, [map, tick]);
  return null;
};

export const WorldMap: React.FC<Props> = ({ data, height = 560 }) => {
  const { t } = useTranslation('listeners');
  const regionName = useRegionNamer();
  const shapes = useCountryShapes();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [resetTick, setResetTick] = useState(0);

  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    data.forEach((d) => {
      if (d.count > 0) m.set((d.code || '').toUpperCase(), d.count);
    });
    return m;
  }, [data]);

  const max = useMemo(() => Math.max(1, ...counts.values()), [counts]);
  const colorFor = (count: number) =>
    interpolateBlues(0.35 + 0.6 * (count / max));

  const active = useMemo(() => {
    if (!shapes) return [];
    return [...counts.entries()]
      .map(([code, count]) => ({ shape: shapes.get(code), count }))
      .filter((a): a is { shape: CountryShape; count: number } => !!a.shape);
  }, [shapes, counts]);

  const signature = active
    .map((a) => a.shape.code)
    .sort()
    .join(',');

  const focusBounds = useMemo(() => {
    if (active.length === 0) return null;
    const b = L.latLngBounds([]);
    active.forEach((a) => b.extend(a.shape.bounds));
    return b;
  }, [active]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    wrapperRef.current?.requestFullscreen();
  };

  const tooltipText = (code: string, count: number) =>
    `${flagEmoji(code)} ${regionName(code) ?? code} · ${t('listenerCount', { count })}`;

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 1.5 }}>
      <Box
        ref={wrapperRef}
        sx={{
          position: 'relative',
          height: fullscreen ? '100vh' : height,
          borderRadius: fullscreen ? 0 : 1,
          overflow: 'hidden',
          bgcolor: '#e8eef3',
          '& .leaflet-container': { width: '100%', height: '100%' },
        }}
      >
        <MapContainer
          center={WORLD_CENTER}
          zoom={WORLD_ZOOM}
          minZoom={2}
          worldCopyJump
          scrollWheelZoom={fullscreen}
          style={{ background: '#e8eef3' }}
        >
          <TileLayer
            url={TILE_URL}
            attribution={TILE_ATTRIBUTION}
            maxZoom={TILE_MAX_ZOOM}
          />

          {active.map(({ shape, count }) => (
            <GeoJSON
              key={`${shape.code}-${count}-${max}`}
              data={shape.feature}
              style={{
                color: colorFor(count),
                weight: 1.5,
                fillColor: colorFor(count),
                fillOpacity: 0.35,
              }}
            >
              <LeafletTooltip sticky>
                {tooltipText(shape.code, count)}
              </LeafletTooltip>
            </GeoJSON>
          ))}

          {active.map(({ shape, count }) => (
            <Marker
              key={shape.code}
              position={shape.center}
              icon={countBadge(count, colorFor(count))}
            >
              <LeafletTooltip direction="top" offset={[0, -18]}>
                {tooltipText(shape.code, count)}
              </LeafletTooltip>
            </Marker>
          ))}

          <FitToListeners
            bounds={focusBounds}
            signature={signature}
            resetTick={resetTick}
          />
          <InvalidateOnResize tick={fullscreen} />
        </MapContainer>

        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Tooltip
            title={fullscreen ? t('exitFullscreen') : t('fullscreen')}
            placement="left"
          >
            <IconButton
              onClick={toggleFullscreen}
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              {fullscreen ? (
                <FullscreenExitRoundedIcon />
              ) : (
                <FullscreenRoundedIcon />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('recenter')} placement="left">
            <IconButton
              onClick={() => setResetTick((n) => n + 1)}
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              <CenterFocusStrongRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
};
