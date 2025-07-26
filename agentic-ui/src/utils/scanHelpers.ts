// src/helpers/scanHelpers.ts

import type { ScanJobResult, Artifact } from "../types/scans";

// Robust, type-safe artifact extractor for all backend shapes
export function getArtifacts(result: ScanJobResult): Artifact[] {
  if (!result?.metadata_json) return [];

  const meta: unknown =
    typeof result.metadata_json === "string"
      ? JSON.parse(result.metadata_json)
      : result.metadata_json;

  // 1. Array of columns (with name)
  if (
    Array.isArray(meta) &&
    meta.length > 0 &&
    typeof meta[0] === "object" &&
    meta[0] !== null &&
    "name" in meta[0]
  ) {
    return (meta as Record<string, unknown>[]).map((col) => ({
      ...col,
      table: "",
      name: String(col["name"]),
    })) as Artifact[];
  }

  // 2. Array of names (table/collection names)
  if (
    Array.isArray(meta) &&
    meta.length > 0 &&
    typeof meta[0] === "string"
  ) {
    return (meta as string[]).map((table) => ({
      table,
      name: table,
    }));
  }

  // 3. { objects: [ {name, fields: [...]}, ... ] }
  if (
    typeof meta === "object" &&
    meta !== null &&
    "objects" in meta &&
    Array.isArray((meta as { objects: unknown }).objects)
  ) {
    const objects = (meta as { objects: Array<{ name: string; fields?: Record<string, unknown>[] }> }).objects;
    const resultArr: Artifact[] = [];
    objects.forEach((obj) => {
      if (obj.fields && Array.isArray(obj.fields)) {
        obj.fields.forEach((field: Record<string, unknown>) => {
          resultArr.push({
            ...field,
            table: obj.name,
            name: field.name,
          } as Artifact);
        });
      } else {
        resultArr.push({ table: obj.name, name: obj.name });
      }
    });
    return resultArr;
  }

  // 4. { table: [col, col], ... }
  if (
    typeof meta === "object" &&
    meta !== null &&
    Object.values(meta).some((v) => Array.isArray(v))
  ) {
    const resultArr: Artifact[] = [];
    Object.entries(meta as Record<string, unknown>).forEach(([table, arr]) => {
      if (Array.isArray(arr)) {
        if (arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null && "name" in arr[0]) {
          (arr as Record<string, unknown>[]).forEach((col) => {
            resultArr.push({
              ...col,
              table,
              name: String(col["name"]),
            } as Artifact);
          });
        } else if (arr.length > 0 && typeof arr[0] === "string") {
          (arr as string[]).forEach((colName) => {
            resultArr.push({ table, name: colName });
          });
        }
      }
    });
    return resultArr;
  }

  // 5. { tables: [], views: [], collections: [] }
  if (
    typeof meta === "object" &&
    meta !== null &&
    ("tables" in meta || "views" in meta || "collections" in meta)
  ) {
    const out: Artifact[] = [];
    const obj = meta as Record<string, string[]>;
    (["tables", "views", "collections"] as const).forEach((key) => {
      if (obj[key]) {
        obj[key].forEach((name: string) => {
          out.push({ table: key, name });
        });
      }
    });
    return out;
  }

  // fallback
  return [];
}
