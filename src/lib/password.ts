import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt (nativo do Node): resistente a força bruta, sem dependência nativa extra
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer, options: ScryptOptions, keyLength: number) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, keyLength, options, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Gera o hash no formato `scrypt$N$r$p$sal$hash` (base64), com sal aleatório. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS, KEY_LENGTH);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

/** Compara em tempo constante. Hash ausente ou malformado nunca confere. */
export async function verifyPassword(password: string, stored: string | null | undefined) {
  const [algo, n, r, p, salt, hash] = stored?.split("$") ?? [];
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  try {
    const options = { N: Number(n), r: Number(r), p: Number(p) };
    return timingSafeEqual(await derive(password, Buffer.from(salt, "base64"), options, expected.length), expected);
  } catch {
    return false;
  }
}
