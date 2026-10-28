export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export const success = (message?: string): ActionResult => ({ ok: true, message });
export const failure = (error: string): ActionResult => ({ ok: false, error });
