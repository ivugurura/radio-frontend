import { useMemo } from 'react';
import type { StudioPermission, StudioRole } from '@graphql/graphql';
import {
  SUPPORTED_LANGUAGES,
  STUDIO_BY_LANGUAGE,
  type AppLanguage,
} from '../../i18n/config';
import { useAuth } from './AuthContext';
import { useStudioId } from './LanguageContext';

export type { StudioPermission, StudioRole };

export type StudioAccessEntry = Readonly<{
  studioId: string;
  displayName: string;
  role?: StudioRole | null;
  permissions: readonly StudioPermission[];
  assignableRoles: readonly StudioRole[];
}>;

export type StudioAccessState = Readonly<{
  /** Every studio the user can open (from `me.studioAccess`). */
  studios: readonly StudioAccessEntry[];
  /** The active studio's entry, or null when the user can't open it. */
  current: StudioAccessEntry | null;
  role: StudioRole | null;
  /** Languages whose studio the user can open; language decides the studio. */
  languages: readonly AppLanguage[];
  /** Roles the user may grant in the active studio. */
  assignableRoles: readonly StudioRole[];
  can: (permission: StudioPermission) => boolean;
}>;

/**
 * What the signed-in user may do in the active studio. The API enforces every
 * rule; this only decides what the UI shows.
 */
export function useStudioAccess(): StudioAccessState {
  const { user } = useAuth();
  const studioId = useStudioId();
  const studios = user?.studioAccess;

  return useMemo(() => {
    const list: readonly StudioAccessEntry[] = studios ?? [];
    const current = list.find((s) => s.studioId === studioId) ?? null;
    const permissions = new Set<StudioPermission>(current?.permissions ?? []);
    const reachable = new Set(list.map((s) => s.studioId));
    return {
      studios: list,
      current,
      role: current?.role ?? null,
      languages: SUPPORTED_LANGUAGES.filter((lng) =>
        reachable.has(STUDIO_BY_LANGUAGE[lng]),
      ),
      assignableRoles: current?.assignableRoles ?? [],
      can: (permission) => permissions.has(permission),
    };
  }, [studios, studioId]);
}
