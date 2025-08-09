// src/utils/http.ts

// JSON-safe types
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export type JsonArray = JsonValue[];

/** Narrow error message helper */
function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * POST JSON and return typed data.
 * - No `any`
 * - Optional parser to validate/transform the response (e.g., zod.parse)
 * - Omits body if undefined; sends "null" if explicitly passed
 */
export async function postJSON<T>(
  url: string,
  body?: JsonObject | JsonArray | null,
  parse?: (data: unknown) => T
): Promise<T> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`${resp.status} ${text || resp.statusText}`);
  }

  const data: unknown = await resp.json().catch(() => ({}));
  return parse ? parse(data) : (data as T);
}

/** GET JSON, typed */
export async function getJSON<T>(url: string, parse?: (data: unknown) => T): Promise<T> {
  const resp = await fetch(url, { credentials: "include" });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`${resp.status} ${text || resp.statusText}`);
  }
  const data: unknown = await resp.json().catch(() => ({}));
  return parse ? parse(data) : (data as T);
}

export { toErrorMessage };
