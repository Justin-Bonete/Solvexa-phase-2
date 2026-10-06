import { hash, verify, type Algorithm } from '@node-rs/argon2';

/** Argon2id (algorithm 2), 64 MiB / t=3 / p=1. Tune against the production host (target ~150 ms). */
const OPTS = { algorithm: 2 as Algorithm, memoryCost: 65536, timeCost: 3, parallelism: 1 } as const;

export const hashPassword = (pw: string) => hash(pw, OPTS);

export async function verifyPassword(hashed: string, pw: string): Promise<boolean> {
  try {
    return await verify(hashed, pw);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;
/** Burn equivalent CPU for unknown accounts so response timing doesn't reveal existence. */
export async function burnVerify(pw: string): Promise<void> {
  dummy ??= hashPassword('not-a-real-password-for-timing');
  await verifyPassword(await dummy, pw);
}
