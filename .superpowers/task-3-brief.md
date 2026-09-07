# Task 3: Initialize Tauri v2 in the Project

## Files:
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Modify: `package.json` (add Tauri scripts)
- Modify: `.gitignore` (add Tauri artifacts)

## Interfaces:
- Consumes: `dist/` static output from `nuxi generate`
- Produces: Tauri project structure ready to build

## Steps:

- [ ] **Step 1: Check if Rust/Cargo is installed**

```bash
rustc --version
cargo --version
```

If not installed, install from https://rustup.rs/

- [ ] **Step 2: Install Tauri CLI**

```bash
cargo install tauri-cli
```

Verify: `cargo tauri --version`

- [ ] **Step 3: Create src-tauri directory structure**

```bash
mkdir src-tauri
mkdir src-tauri/src
```

- [ ] **Step 4: Create src-tauri/tauri.conf.json**

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-config-schema/schema.json",
  "productName": "FocusTide",
  "version": "1.7.0",
  "identifier": "app.focustide.desktop",
  "build": {
    "beforeDevCommand": "",
    "beforeBuildCommand": "yarn generate",
    "devUrl": "",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "FocusTide",
        "width": 480,
        "height": 720,
        "resizable": true,
        "fullscreen": false,
        "decorations": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; media-src 'self'"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "webviewInstallMode": {
        "type": "embedBootstrapper"
      }
    },
    "linux": {
      "appimage": {
        "bundleMediaFramework": false
      }
    }
  }
}
```

- [ ] **Step 5: Create src-tauri/Cargo.toml**

```toml
[package]
name = "focustide"
version = "1.7.0"
description = "Modern and customizable productivity timer"
authors = ["FocusTide"]
edition = "2021"

[lib]
name = "focustide_lib"
crate-type = ["lib", "cdylib", "staticlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 6: Create src-tauri/build.rs**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 7: Create src-tauri/src/main.rs**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 8: Create src-tauri/src/lib.rs**

```rust
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 9: Add Tauri scripts to package.json**

Add to the `scripts` section:
```json
"tauri": "tauri",
"tauri:dev": "tauri dev",
"tauri:build": "tauri build"
```

- [ ] **Step 10: Update .gitignore**

Add these lines:
```
# Tauri
src-tauri/target/
```

- [ ] **Step 11: Verify Cargo.toml is valid**

```bash
cd src-tauri && cargo check
```

This will download dependencies and verify the Rust code compiles. It may take a few minutes on first run.

- [ ] **Step 12: Commit**

```bash
git add src-tauri/ package.json .gitignore
git commit -m "feat: initialize Tauri v2 desktop wrapper"
```

## Key Context

- Tauri v2 uses the OS native webview (WebView2 on Windows, WKWebView on macOS, webkit2gtk on Linux)
- This means the executable will be small (~5-15MB) since it doesn't bundle Chromium
- The `frontendDist` points to `../dist` which is where `nuxi generate` outputs static files
- The `beforeBuildCommand` runs `yarn generate` to ensure fresh static output before bundling
- The CSP needs `media-src 'self'` for audio playback and `font-src` for Google Fonts

## Global Constraints

- Target executable size: <50MB
- Must preserve all existing functionality
- Follow existing platform abstraction pattern
