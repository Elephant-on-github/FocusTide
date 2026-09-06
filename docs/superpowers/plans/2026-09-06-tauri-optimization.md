# Tauri Build Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize Tauri build for smaller binary (~6-7MB) and lower WebView2 memory via V8 flags and inactive-window memory swapping.

**Architecture:** Modify Cargo.toml release profile for size optimization, add V8 memory flags to WebView2 browser args, and add Rust code to swap WebView2 memory to disk when window is inactive.

**Tech Stack:** Rust, Tauri v2, wry (WebView2 bindings), Cargo release profiles

## Global Constraints
- Rust edition 2021
- Tauri v2 (no version upgrade)
- WebView2 on Windows (system webview)
- Web build (`nuxi generate`) must remain unchanged
- Min window: 300×300

---

### Task 1: Optimize Cargo Release Profile

**Files:**
- Modify: `src-tauri/Cargo.toml`

**Interfaces:**
- Consumes: existing `Cargo.toml` with `[package]` and `[dependencies]`
- Produces: optimized release profile that reduces binary size

- [ ] **Step 1: Add release profile optimizations**

Add the following to the end of `src-tauri/Cargo.toml`:

```toml
[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
strip = true
panic = "abort"
```

- [ ] **Step 2: Verify the file is valid TOML**

Run: `cd C:\Users\eleph\.ai\temp\FocusTide\src-tauri && cargo check 2>&1`
Expected: Compiles without errors (may warn about unused features)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m ":package: Optimize Rust release profile for smaller binary"
```

---

### Task 2: Add WebView2 Memory Flags

**Files:**
- Modify: `src-tauri/tauri.conf.json:23`

**Interfaces:**
- Consumes: existing `additionalBrowserArgs` string
- Produces: extended flags that reduce V8 memory and disable unnecessary features

- [ ] **Step 1: Add V8 and feature flags to additionalBrowserArgs**

In `src-tauri/tauri.conf.json`, replace the `additionalBrowserArgs` value with:

```
--disable-extensions --disable-background-networking --disable-default-apps --disable-sync --disable-translate --metrics-recording-only --no-first-run --safebrowsing-disable-auto-update --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --js-flags=--scavenger_max_new_space_capacity_mb=8 --disable-features=msSmartScreenProtection,msWebView2EnableTrackingPrevention
```

This adds two new flags:
- `--js-flags=--scavenger_max_new_space_capacity_mb=8` — reduces V8 garbage collector memory from default ~16MB to 8MB
- `--disable-features=msSmartScreenProtection,msWebView2EnableTrackingPrevention` — disables unnecessary WebView2 features

- [ ] **Step 2: Validate JSON**

Run: `cd C:\Users\eleph\.ai\temp\FocusTide && node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m ":wrench: Add V8 memory flags and disable unnecessary WebView2 features"
```

---

### Task 3: Add Window Focus Event Handler for Memory Swapping

**Files:**
- Modify: `src-tauri/src/main.rs`

**Interfaces:**
- Consumes: Tauri `Builder::default()`, `tauri::Manager` trait, `wry::WebViewExtWindows` trait
- Produces: window event handler that sets `MemoryUsageTargetLevel::Low` on blur/minimize and `Normal` on focus

- [ ] **Step 1: Write the window event handler**

Replace the contents of `src-tauri/src/main.rs` with:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[cfg(target_os = "windows")]
use wry::WebViewExtWindows;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                let window = app.get_webview_window("main").unwrap();
                let webview = window.as_ref().webview();

                // Set low memory when window loses focus
                let webview_clone = webview.clone();
                window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::Focused(focused) => {
                            if *focused {
                                webview_clone.set_memory_usage_level(
                                    wry::MemoryUsageLevel::Normal
                                );
                            } else {
                                webview_clone.set_memory_usage_level(
                                    wry::MemoryUsageLevel::Low
                                );
                            }
                        }
                        tauri::WindowEvent::Moved(_) => {
                            // Also reduce on move (user is dragging, window is active but busy)
                        }
                        _ => {}
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd C:\Users\eleph\.ai\temp\FocusTide\src-tauri && cargo check 2>&1`
Expected: Compiles without errors

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m ":sparkles: Add WebView2 memory swapping on window focus loss"
```

---

### Task 4: Build and Verify Binary Size

**Files:**
- No file changes — verification only

**Interfaces:**
- Consumes: optimized Cargo.toml, tauri.conf.json, main.rs from Tasks 1-3
- Produces: verified binary size < 7MB

- [ ] **Step 1: Build release binary**

Run: `cd C:\Users\eleph\.ai\temp\FocusTide && cargo tauri build 2>&1`
Expected: Build succeeds, produces exe in `src-tauri/target/release/`

- [ ] **Step 2: Check exe size**

Run: `(Get-Item "C:\Users\eleph\.ai\temp\FocusTide\src-tauri\target\release\focustide.exe").Length / 1MB`
Expected: Size < 7MB (was 9.4MB before optimization)

- [ ] **Step 3: Launch and verify window at 300×300**

Run: `Start-Process "C:\Users\eleph\.ai\temp\FocusTide\src-tauri\target\release\focustide.exe"`
Then resize window to 300×300. Verify text and buttons scale proportionally.

- [ ] **Step 4: Check memory behavior**

Open Task Manager → find FocusTide → note memory usage. Minimize window → wait 5 seconds → check if memory decreased. Restore window → verify UI returns to normal.

- [ ] **Step 5: Commit build artifacts (if size target met)**

```bash
git add -A
git commit -m ":white_check_mark: Verified optimized build: <7MB exe, memory swapping works"
```
