# Tauri Build Optimization Design

## Goal
Optimize the existing Tauri v2 desktop build for smaller binary size and lower WebView2 memory usage, while preserving the web build and 300×300 responsive scaling.

## Current State
- Binary: 9.4MB exe, 5.8MB MSI, 4.8MB NSIS
- WebView2 RAM: ~475MB (platform limitation)
- Min window: 300×300
- Text scaling: viewport-responsive `clamp()` + root font-size

## Changes

### 1. Binary Size (~9.4MB → ~6-7MB)

**File: `src-tauri/Cargo.toml`** — Add release profile optimizations:
```toml
[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
strip = true
panic = "abort"
```

**File: `src-tauri/Cargo.toml`** — Audit and remove unused Tauri features from the `tauri` dependency.

### 2. WebView2 Memory Optimization

**File: `src-tauri/tauri.conf.json`** — Add V8 flags to `additionalBrowserArgs`:
```
--js-flags=--scavenger_max_new_space_capacity_mb=8
--disable-features=msSmartScreenProtection,msWebView2EnableTrackingPrevention
```

**File: `src-tauri/src/main.rs`** — Add window event handler:
- On `Moved` / `Resized` / focus loss → set `MemoryUsageTargetLevel::Low` via `wry` API
- On `Focus` / `CloseRequested` (show) → restore `MemoryUsageTargetLevel::Normal`

This swaps WebView2 memory to disk when the window is inactive, reducing visible RAM usage.

### 3. Web Build (no changes)

The Nuxt static build (`nuxi generate` → `.output/public/`) remains unchanged. Tauri wraps the same output. All Vue components, Tailwind CSS, and platform modules stay as-is.

## Verification
1. `cargo tauri build` — check exe size < 7MB
2. Launch app, resize to 300×300 — verify text/buttons scale
3. Minimize window — observe RAM reduction in Task Manager
4. Restore window — verify UI returns to normal
5. Web build (`yarn generate && npx serve .output/public`) — verify unchanged
