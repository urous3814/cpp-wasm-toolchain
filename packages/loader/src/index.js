/**
 * @cpp-wasm-toolchain/loader
 *
 * High-level interface for loading toolchain assets.
 * Handles manifest fetching, field validation, and URL resolution.
 * Does NOT perform compilation or linking.
 */
// ── Internal validation ───────────────────────────────────────────────────────
function requireString(obj, path) {
    const parts = path.split('.');
    let cur = obj;
    for (const part of parts) {
        if (cur == null || typeof cur !== 'object') {
            throw new Error(`[loader] manifest missing field: ${path}`);
        }
        cur = cur[part];
    }
    if (typeof cur !== 'string' || cur.trim() === '') {
        throw new Error(`[loader] manifest field must be a non-empty string: ${path}`);
    }
    return cur;
}
function validateManifest(raw) {
    if (raw == null || typeof raw !== 'object') {
        throw new Error('[loader] manifest is not an object');
    }
    return {
        name: requireString(raw, 'name'),
        version: requireString(raw, 'version'),
        target: requireString(raw, 'target'),
        abi: raw.abi,
        compiler: {
            entry: requireString(raw, 'compiler.entry'),
            wasm: requireString(raw, 'compiler.wasm'),
        },
        linker: {
            entry: requireString(raw, 'linker.entry'),
            wasm: requireString(raw, 'linker.wasm'),
        },
        sysroot: {
            include: requireString(raw, 'sysroot.include'),
            lib: requireString(raw, 'sysroot.lib'),
        },
        runtime: {
            entry: requireString(raw, 'runtime.entry'),
        },
    };
}
/** Derive the base URL from the manifest URL (parent directory). */
function manifestBaseUrl(manifestUrl) {
    // Works for both absolute URLs and relative paths.
    const lastSlash = manifestUrl.lastIndexOf('/');
    return lastSlash >= 0 ? manifestUrl.slice(0, lastSlash + 1) : './';
}
function resolveAsset(base, asset) {
    // If the asset is already an absolute URL, return as-is.
    if (/^https?:\/\//.test(asset))
        return asset;
    return base + asset;
}
// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Fetch and validate a toolchain manifest from the given URL.
 */
export async function loadManifest(manifestUrl) {
    let res;
    try {
        res = await fetch(manifestUrl);
    }
    catch (e) {
        throw new Error(`[loader] failed to fetch manifest from ${manifestUrl}: ${e}`);
    }
    if (!res.ok) {
        throw new Error(`[loader] manifest fetch failed (${res.status}): ${manifestUrl}`);
    }
    const raw = await res.json();
    return validateManifest(raw);
}
/**
 * Resolve all asset URLs relative to the manifest location.
 * Returns a fully populated LoadedToolchain without loading any WASM.
 */
export function resolveToolchain(manifestUrl, manifest) {
    const base = manifestBaseUrl(manifestUrl);
    const r = (asset) => resolveAsset(base, asset);
    return {
        manifest,
        baseUrl: base,
        compilerEntryUrl: r(manifest.compiler.entry),
        compilerWasmUrl: r(manifest.compiler.wasm),
        linkerEntryUrl: r(manifest.linker.entry),
        linkerWasmUrl: r(manifest.linker.wasm),
        sysrootIncludeUrl: r(manifest.sysroot.include),
        sysrootLibUrl: r(manifest.sysroot.lib),
        runtimeEntryUrl: r(manifest.runtime.entry),
    };
}
/**
 * Validate that the toolchain has a resolvable runtime entry and return a
 * normalized PreparedExecution object ready for future compile/run stages.
 */
export function prepareExecution(toolchain) {
    const { runtimeEntryUrl } = toolchain;
    if (!runtimeEntryUrl || runtimeEntryUrl.trim() === '') {
        throw new Error('[loader] toolchain is missing a runtime entry URL');
    }
    return {
        toolchain,
        runtimeModuleUrl: runtimeEntryUrl,
    };
}
