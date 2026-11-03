import { createSHA256 } from 'hash-wasm';
import { BASE_API_URL } from '@libs/constants';
import { DEFAULT_CHUNK_SIZE, HASH_READ_SIZE } from './constants';

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  do {
    n = n / 1024;
    i++;
  } while (n >= 1024 && i < units.length - 1);
  return `${n.toFixed(1)} ${units[i]}`;
}

/**
 * SHA-256 of the whole file, read in HASH_READ_SIZE slices so memory stays
 * flat even for long recordings. The server uses it to reject exact duplicates.
 */
export async function computeSHA256(
  file: File,
  signal: AbortSignal,
): Promise<string> {
  const hasher = await createSHA256();
  for (let start = 0; start < file.size; start += HASH_READ_SIZE) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const slice = file.slice(start, start + HASH_READ_SIZE);
    hasher.update(new Uint8Array(await slice.arrayBuffer()));
  }
  return hasher.digest('hex');
}

export function isAudioFile(file: File) {
  if (file.type) return file.type.startsWith('audio/');
  // Some browsers leave type empty for e.g. .flac; fall back to the extension.
  return /\.(mp3|wav|flac|m4a|aac|ogg|oga|opus|wma|aiff?)$/i.test(file.name);
}

/**
 * PUT the file to chunkUrl in DEFAULT_CHUNK_SIZE pieces.
 * - header: Content-Range: bytes {start}-{end}/{total}
 * - header: X-Upload-Token: <uploadToken>
 * The server answers {"received": <bytes>} after each chunk; we continue from
 * that offset so the server's record wins over our own count.
 */
export async function uploadInChunks(
  file: File,
  chunkUrl: string,
  uploadToken: string,
  signal: AbortSignal,
  onProgress: (bytesSent: number) => void,
) {
  const total = file.size;
  const uploadUrl = BASE_API_URL + chunkUrl;
  let start = 0;

  while (start < total) {
    const end = Math.min(start + DEFAULT_CHUNK_SIZE, total) - 1;
    const resp = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'X-Upload-Token': uploadToken,
      },
      body: file.slice(start, end + 1),
      signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(
        `Chunk failed: ${resp.status} ${resp.statusText} ${text}`,
      );
    }

    const json = (await resp.json().catch(() => ({}))) as {
      received?: number;
    };
    start = typeof json.received === 'number' ? json.received : end + 1;
    onProgress(start);
  }
}
