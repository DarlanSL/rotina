import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clearFailures, lockedMinutes, LOCK_MS, MAX_FAILURES, registerFailure } from "@/lib/login-throttle";
import { changePasswordSchema, signupSchema } from "@/lib/validations";

describe("senhas", () => {
  it("confere a senha certa e recusa a errada", async () => {
    const hash = await hashPassword("minha senha 123");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("minha senha 123", hash)).toBe(true);
    expect(await verifyPassword("minha senha 124", hash)).toBe(false);
  });

  it("mesmo texto gera hashes diferentes (sal aleatório)", async () => {
    expect(await hashPassword("abc12345")).not.toBe(await hashPassword("abc12345"));
  });

  it("hash ausente ou corrompido nunca confere", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "scrypt$abc$8$1$AAAA$BBBB")).toBe(false);
  });
});

describe("bloqueio por tentativas", () => {
  it(`bloqueia após ${MAX_FAILURES} erros e libera depois do tempo`, () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_FAILURES - 1; i++) registerFailure("ana", now);
    expect(lockedMinutes("ana", now)).toBe(0);
    registerFailure("ana", now);
    expect(lockedMinutes("ana", now)).toBe(LOCK_MS / 60_000);
    expect(lockedMinutes("ana", now + LOCK_MS)).toBe(0);
    // após o bloqueio, um novo erro não bloqueia de novo de imediato
    registerFailure("ana", now + LOCK_MS);
    expect(lockedMinutes("ana", now + LOCK_MS)).toBe(0);
  });

  it("login certo zera a contagem", () => {
    for (let i = 0; i < MAX_FAILURES - 1; i++) registerFailure("bia");
    clearFailures("bia");
    registerFailure("bia");
    expect(lockedMinutes("bia")).toBe(0);
  });
});

describe("cadastro", () => {
  const base = { name: "Ana", username: "Ana.Silva", password: "segredo123", confirm: "segredo123" };

  it("normaliza o usuário para minúsculas", () => {
    expect(signupSchema.parse(base).username).toBe("ana.silva");
  });

  it("recusa usuário com espaço/acento, senha curta e confirmação diferente", () => {
    expect(signupSchema.safeParse({ ...base, username: "ana silva" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, username: "joão" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, password: "curta", confirm: "curta" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, confirm: "outra123" }).success).toBe(false);
  });

  it("nova senha precisa ser diferente da atual", () => {
    const r = changePasswordSchema.safeParse({ current: "segredo123", password: "segredo123", confirm: "segredo123" });
    expect(r.success).toBe(false);
  });
});
