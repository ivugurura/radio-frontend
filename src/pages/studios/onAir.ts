import { STUDIO_URL } from '@libs/constants';

// radio-studio usually applies a change within a second of the backend's
// notification; deactivating can take a little longer while listeners drop.
const WAIT_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 1000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** On air (true), off air (false), or unknown (null: unreachable). */
const fetchOnAir = async (studioId: string): Promise<boolean | null> => {
  try {
    const url = `${STUDIO_URL}/${encodeURIComponent(studioId)}/health`;
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) return true;
    if (response.status === 404) return false;
  } catch {
    // Network error or CORS: treat as unknown and keep checking.
  }
  return null;
};

/**
 * Waits until radio-studio serves (`onAir`) or no longer serves the studio.
 * Resolves false if that hasn't happened in time; radio-studio's periodic
 * check then applies the change within 5 minutes.
 */
export const waitForStudioOnAir = async (
  studioId: string,
  onAir: boolean,
): Promise<boolean> => {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if ((await fetchOnAir(studioId)) === onAir) return true;
    await sleep(POLL_INTERVAL_MS);
  }
  return false;
};
