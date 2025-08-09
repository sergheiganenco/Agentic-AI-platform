// src/utils/normalizeArtifacts.ts

import type { ArtifactApiResponse, Artifact } from "../types/scans";

const ARTIFACT_KEYS = [
  "tables",
  "views",
  "procedures",
  "functions",
  "collections",
  "indexes",
  "triggers"
];

export function normalizeArtifacts(data: ArtifactApiResponse, sourceType: string): Artifact[] {
  if (!data) return [];

  // 1. Flat artifact array
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === "object" && data[0] !== null && "name" in data[0]) {
      return data as Artifact[];
    }
    return (data as string[]).map((name) => ({
      name,
      table: name,
      object_type: sourceType === "mongodb" ? "collection" : "table",
    }));
  }

  // 2. Object with artifact lists
  const result: Artifact[] = [];
  ARTIFACT_KEYS.forEach((key) => {
    const arr = (data as Record<string, unknown>)[key];
    if (Array.isArray(arr)) {
      if (arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null && "name" in arr[0]) {
        result.push(...(arr as Artifact[]).map((obj) => ({
          ...obj,
          object_type: obj.object_type || key.slice(0, -1),
        })));
      } else if (arr.length > 0 && typeof arr[0] === "string") {
        result.push(...(arr as string[]).map((name) => ({
          name,
          table: name,
          object_type: key.slice(0, -1),
        })));
      }
    }
  });

  // 3. Flat { objects: [...] }
  if (
    "objects" in (data as Record<string, unknown>) &&
    Array.isArray((data as Record<string, unknown>).objects)
  ) {
    const objs = (data as Record<string, unknown>).objects as Artifact[];
    return objs.map((obj) => ({
      ...obj,
      object_type: obj.object_type || (sourceType === "mongodb" ? "collection" : "table"),
    }));
  }

  // 4. Mongo style: { collections: [...] }
  if ("collections" in (data as Record<string, unknown>)) {
    const arr = (data as Record<string, unknown>)["collections"];
    if (Array.isArray(arr)) {
      return arr.map((obj) =>
        typeof obj === "string"
          ? { name: obj, table: obj, object_type: "collection" }
          : { ...(obj as Artifact), object_type: (obj as Artifact).object_type || "collection" }
      );
    }
  }

  // 5. Single artifact
  if ("name" in (data as Record<string, unknown>)) {
    const single = data as Artifact;
    return [
      {
        ...single,
        object_type: single.object_type || (sourceType === "mongodb" ? "collection" : "table"),
      },
    ];
  }

  return result;
}
