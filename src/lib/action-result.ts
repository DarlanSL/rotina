/** `id`: registro criado, quando o chamador precisa dele (ex.: anexar fotos a um item novo). */
export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

export const success = (message?: string, id?: string): ActionResult => ({ ok: true, message, id });
export const failure = (error: string): ActionResult => ({ ok: false, error });
