/**
 * Drop your mug.glb or mug.gltf under `public/models/` and set the URL below
 * or use env: NEXT_PUBLIC_MUG_MODEL_URL=/models/mug.glb
 *
 * In Blender (or your DCC), name the printable outer surface mesh so we can
 * assign the design texture — see MUG_DESIGN_MESH_NAMES.
 */

/** Example: '/models/mug.glb' — set to null to use the built-in procedural mug */
export const MUG_MODEL_URL: string | null = '/models/mug_heart.glb';

/**
 * Mesh names (case-insensitive) that receive the flat design texture and cup color tint.
 * If empty, the first mesh in the file is used (not ideal — name meshes in your GLB).
 *
 * When MUG_ORBIT_CENTER_MESH_NAMES is empty, these meshes are also used for the orbit
 * pivot (true cylinder axis). Name your main outer wall here (e.g. `['Cup', 'Body']`).
 */
export const MUG_DESIGN_MESH_NAMES: string[] = [];

/**
 * Mesh names for the inside / rim that should stay light (fixed white), no texture.
 * Other meshes get cup color only (no design texture).
 */
export const MUG_INTERIOR_MESH_NAMES: string[] = [];

/**
 * If non-empty, orbit / look-at pivot uses only these meshes (e.g. main cup body).
 * Overrides default handle exclusion when set.
 */
export const MUG_ORBIT_CENTER_MESH_NAMES: string[] = [];

const DEFAULT_ORBIT_EXCLUDE_NAMES = ['handle', 'mughandle', 'mug_handle'];

/**
 * Mesh names (case-insensitive, exact) excluded from orbit pivot when
 * MUG_ORBIT_CENTER_MESH_NAMES is empty. If this array is non-empty, it replaces defaults.
 */
export const MUG_ORBIT_EXCLUDE_MESH_NAMES: string[] = [];

export function getMugOrbitExcludeNames(): string[] {
  if (MUG_ORBIT_EXCLUDE_MESH_NAMES.length > 0) {
    return MUG_ORBIT_EXCLUDE_MESH_NAMES;
  }
  return DEFAULT_ORBIT_EXCLUDE_NAMES;
}

export function getMugModelUrl(): string | null {
  const env = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MUG_MODEL_URL : undefined;
  if (env != null && String(env).trim() !== '') {
    return String(env).trim();
  }
  return MUG_MODEL_URL;
}
