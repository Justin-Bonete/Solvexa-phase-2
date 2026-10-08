import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { Env } from '../../env';

/**
 * Private file storage. Files are never served from a public path: the API streams them after an authorization check.
 * Keys are server-generated and random; user-supplied names never touch the storage layer.
 */
export interface Storage {
  readonly name: 'local' | 'memory' | 'vercel-blob' | 'none';
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_.-]{0,200}$/i;
export function assertSafeKey(key: string): void {
  if (!SAFE_KEY.test(key) || key.includes('..') || key.includes('//')) throw new Error('Unsafe storage key');
}
export const newStorageKey = (scope: string) => `${scope}/${randomBytes(16).toString('hex')}`;

/** Dev driver. Writes outside the web root (default .data/uploads) and refuses to overwrite. */
export class LocalStorage implements Storage {
  readonly name = 'local' as const;
  private readonly root: string;
  constructor(dir: string) {
    this.root = resolve(dir);
  }
  private path(key: string): string {
    assertSafeKey(key);
    const full = resolve(this.root, key);
    if (!full.startsWith(this.root + sep)) throw new Error('Unsafe storage key');
    return full;
  }
  async put(key: string, data: Buffer, _contentType?: string): Promise<void> {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data, { flag: 'wx', mode: 0o600 });
  }
  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.path(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }
  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }
}

export class MemoryStorage implements Storage {
  readonly name = 'memory' as const;
  readonly files = new Map<string, { data: Buffer; contentType: string }>();
  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    assertSafeKey(key);
    if (this.files.has(key)) throw new Error('Refusing to overwrite');
    this.files.set(key, { data, contentType });
  }
  async get(key: string): Promise<Buffer | null> {
    return this.files.get(key)?.data ?? null;
  }
  async delete(key: string): Promise<void> {
    this.files.delete(key);
  }
}

/**
 * Production driver: a PRIVATE Vercel Blob store. Authenticates with BLOB_READ_WRITE_TOKEN or Vercel's OIDC.
 * NOTE: written against @vercel/blob's type definitions but not exercised against a real store in CI.
 */
export class VercelBlobStorage implements Storage {
  readonly name = 'vercel-blob' as const;
  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    assertSafeKey(key);
    const { put } = await import('@vercel/blob');
    await put(key, data, { access: 'private', contentType, addRandomSuffix: false, allowOverwrite: false });
  }
  async get(key: string): Promise<Buffer | null> {
    assertSafeKey(key);
    const { get } = await import('@vercel/blob');
    const res = await get(key, { access: 'private', useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return Buffer.from(await new Response(res.stream).arrayBuffer());
  }
  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    const { del } = await import('@vercel/blob');
    await del(key);
  }
}

/** Uploads switched off. put() fails, so the API answers 503 UPLOADS_UNAVAILABLE and the request itself is still saved. */
export class NoStorage implements Storage {
  readonly name = 'none' as const;
  async put(): Promise<void> {
    throw new Error('File storage is not configured');
  }
  async get(): Promise<Buffer | null> {
    return null;
  }
  async delete(): Promise<void> {
    /* nothing stored */
  }
}

export function createStorage(env: Env): Storage {
  if (env.STORAGE_DRIVER === 'none') return new NoStorage();
  return env.STORAGE_DRIVER === 'blob' ? new VercelBlobStorage() : new LocalStorage(env.STORAGE_DIR);
}
