/**
 * @cpp-wasm-toolchain/loader
 *
 * High-level interface for loading toolchain assets.
 * Handles manifest fetching, field validation, and URL resolution.
 * Does NOT perform compilation or linking.
 */

// ── Public types ──────────────────────────────────────────────────────────────

export type ToolchainManifest = {
  name: string;
  version: string;
  target: string;
  abi?: string;
  compiler: {
    entry: string;
    wasm: string;
  };
  linker: {
    entry: string;
    wasm: string;
  };
  sysroot: {
    include: string;
    lib: string;
  };
  runtime: {
    entry: string;
  };
};

export type LoadedToolchain = {
  manifest: ToolchainManifest;
  baseUrl: string;
  compilerEntryUrl: string;
  compilerWasmUrl: string;
  linkerEntryUrl: string;
  linkerWasmUrl: string;
  sysrootIncludeUrl: string;
  sysrootLibUrl: string;
  runtimeEntryUrl: string;
};

// ── Internal validation ───────────────────────────────────────────────────────

function requireString(obj: unknown, path: string): string {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') {
      throw new Error(`[loader] manifest missing field: ${path}`);
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  if (typeof cur !== 'string' || cur.trim() === '') {
    throw new Error(`[loader] manifest field must be a non-empty string: ${path}`);
  }
  return cur;
}

function validateManifest(raw: unknown): ToolchainManifest {
  if (raw == null || typeof raw !== 'object') {
    throw new Error('[loader] manifest is not an object');
  }

  return {
    name:    requireString(raw, 'name'),
    version: requireString(raw, 'version'),
    target:  requireString(raw, 'target'),
    abi:     (raw as Record<string, unknown>).abi as string | undefined,
    compiler: {
      entry: requireString(raw, 'compiler.entry'),
      wasm:  requireString(raw, 'compiler.wasm'),
    },
    linker: {
      entry: requireString(raw, 'linker.entry'),
      wasm:  requireString(raw, 'linker.wasm'),
    },
    sysroot: {
      include: requireString(raw, 'sysroot.include'),
      lib:     requireString(raw, 'sysroot.lib'),
    },
    runtime: {
      entry: requireString(raw, 'runtime.entry'),
    },
  };
}

/** Derive the base URL from the manifest URL (parent directory). */
function manifestBaseUrl(manifestUrl: string): string {
  // Works for both absolute URLs and relative paths.
  const lastSlash = manifestUrl.lastIndexOf('/');
  return lastSlash >= 0 ? manifestUrl.slice(0, lastSlash + 1) : './';
}

function resolveAsset(base: string, asset: string): string {
  // If the asset is already an absolute URL, return as-is.
  if (/^https?:\/\//.test(asset)) return asset;
  return base + asset;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch and validate a toolchain manifest from the given URL.
 */
export async function loadManifest(manifestUrl: string): Promise<ToolchainManifest> {
  let res: Response;
  try {
    res = await fetch(manifestUrl);
  } catch (e) {
    throw new Error(`[loader] failed to fetch manifest from ${manifestUrl}: ${e}`);
  }
  if (!res.ok) {
    throw new Error(`[loader] manifest fetch failed (${res.status}): ${manifestUrl}`);
  }
  const raw: unknown = await res.json();
  return validateManifest(raw);
}

/**
 * Resolve all asset URLs relative to the manifest location.
 * Returns a fully populated LoadedToolchain without loading any WASM.
 */
export function resolveToolchain(
  manifestUrl: string,
  manifest: ToolchainManifest,
): LoadedToolchain {
  const base = manifestBaseUrl(manifestUrl);
  const r = (asset: string) => resolveAsset(base, asset);

  return {
    manifest,
    baseUrl:           base,
    compilerEntryUrl:  r(manifest.compiler.entry),
    compilerWasmUrl:   r(manifest.compiler.wasm),
    linkerEntryUrl:    r(manifest.linker.entry),
    linkerWasmUrl:     r(manifest.linker.wasm),
    sysrootIncludeUrl: r(manifest.sysroot.include),
    sysrootLibUrl:     r(manifest.sysroot.lib),
    runtimeEntryUrl:   r(manifest.runtime.entry),
  };
}
