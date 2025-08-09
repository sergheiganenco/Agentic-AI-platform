import type { ScanJobResult, Artifact } from "../types/scans";

// Mongo-style object
interface MongoObject {
  name: string;
  object_type?: string;
  fields?: Artifact[];
}

// Type guards
function isMongoWithFields(obj: unknown): obj is { objects: MongoObject[] } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "objects" in obj &&
    Array.isArray((obj as { objects: unknown }).objects) &&
    (
      (obj as { objects: MongoObject[] }).objects.length === 0 ||
      (
        typeof (obj as { objects: MongoObject[] }).objects[0] === "object" &&
        (obj as { objects: MongoObject[] }).objects[0] !== null &&
        "fields" in (obj as { objects: MongoObject[] }).objects[0]
      )
    )
  );
}

function isArtifactArray(obj: unknown): obj is Artifact[] {
  // Flat array, not wrapped in { objects: ... }
  return (
    Array.isArray(obj) &&
    (obj.length === 0 ||
      (typeof obj[0] === "object" &&
        obj[0] !== null &&
        "name" in obj[0] &&
        ("table" in obj[0] || "object_type" in obj[0])))
  );
}

function isObjectArray(obj: unknown): obj is { objects: Artifact[] } {
  // Handles { objects: Artifact[] } or { source_type, objects }
  return (
    typeof obj === "object" &&
    obj !== null &&
    "objects" in obj &&
    Array.isArray((obj as { objects: unknown }).objects)
  );
}

function isNamedArrayObj(obj: unknown): obj is Record<string, string[]> {
  // Handles { tables: [...], views: [...], collections: [...] }
  return (
    typeof obj === "object" &&
    obj !== null &&
    (
      "tables" in obj ||
      "views" in obj ||
      "collections" in obj
    )
  );
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch (err) {
    console.error("Failed to parse metadata_json:", err);
    return null;
  }
}

/**
 * Extract and flatten scan artifacts for table display.
 * Supports all shapes from SQL, Mongo, and future backends.
 */
export function getArtifacts(result: ScanJobResult): Artifact[] {
  if (!result?.metadata_json) return [];

  const meta: unknown = typeof result.metadata_json === "string"
    ? safeParse(result.metadata_json)
    : result.metadata_json;

  // 1. Mongo style: { objects: [{ name, object_type, fields: [...] }, ...] }
  if (isMongoWithFields(meta)) {
    return meta.objects.flatMap(obj =>
      (obj.fields && obj.fields.length > 0)
        ? obj.fields.map(field => ({
            ...field,
            table: obj.name,
            object_type: obj.object_type ?? "collection",
          }))
        : [{
            table: obj.name,
            name: obj.name,
            object_type: obj.object_type ?? "collection"
          }]
    );
  }

  // 2. Flat array (SQL, sometimes Mongo, legacy)
  if (isArtifactArray(meta)) {
    return meta;
  }

  // 3. { objects: Artifact[], ... } or { source_type, objects }
  if (isObjectArray(meta)) {
    const objects = meta.objects;
    // If Mongo-style objects with fields, flatten
    if (objects.length > 0 && "fields" in objects[0]) {
      return (objects as MongoObject[]).flatMap(obj =>
        (obj.fields && obj.fields.length > 0)
          ? obj.fields.map(field => ({
              ...field,
              table: obj.name,
              object_type: obj.object_type ?? "collection"
            }))
          : [{
              table: obj.name,
              name: obj.name,
              object_type: obj.object_type ?? "collection"
            }]
      );
    }
    // Else, treat as a flat artifact array
    return objects as Artifact[];
  }

  // 4. Named arrays (old SQL/Mongo): { tables: [...], views: [...], collections: [...] }
  if (isNamedArrayObj(meta)) {
    const arr: Artifact[] = [];
    (["tables", "views", "collections"] as const).forEach(key => {
      const items = meta[key];
      if (Array.isArray(items)) {
        arr.push(...items.map(name => ({
          table: name,
          name,
          object_type: key.slice(0, -1) // table, view, collection
        })));
      }
    });
    if (arr.length > 0) return arr;
  }

  // 5. Unknown/unsupported shape
  console.warn("getArtifacts: Unknown metadata_json shape", meta);
  return [];
}
