# FocusTide Lightweight Executable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package FocusTide as a lightweight native desktop executable (<50MB) using Tauri v2, addressing open issue #387.

**Architecture:** Build FocusTide as a static site via `nuxi generate`, then wrap it with Tauri v2 which uses the OS native webview (no Chromium bundle). Add a `desktop` platform module following the existing `web`/`mobile` platform pattern. Tauri produces executables ~5-15MB vs Electron's ~150MB+.

**Tech Stack:** Vue 3, Nuxt 3, Pinia, Tauri v2 (Rust backend), native webview (no Electron).

## Global Constraints

- Target executable size: <50MB (Tauri typically produces 5-15MB)
- Must preserve all existing functionality (timer, sounds, notifications, i18n, settings)
- Must work on Windows (.exe), Linux (.AppImage/.deb), macOS (.app)
- Follow existing platform abstraction pattern (`platforms/web.ts`, `platforms/mobile.ts`)
- Nuxt static generation (`nuxi generate`) for the frontend bundle
- Default branch: `develop`

---

## Task 1: Verify Static Build Works

**Files:**
- Read: `nuxt.config.ts` (already configured for SSR + prerender)
- Run: `yarn generate`

**Interfaces:**
- Consumes: existing Nuxt config
- Produces: `dist/` directory with static HTML/JS/CSS

- [ ] **Step 1: Install dependencies**

```bash
cd C:\Users\eleph\.ai\temp\FocusTide
yarn install
```

- [ ] **Step 2: Generate static site**

```bash
yarn generate
```

Expected: `dist/` directory created with `index.html` and assets

- [ ] **Step 3: Verify output size**

```bash
# Check total size of dist/
# PowerShell:
(Get-ChildItem -Recurse dist | Measure-Object -Property Length -Sum).Sum / 1MB
```

Expected: <5MB for the static bundle (HTML + JS + CSS + assets)

- [ ] **Step 4: Commit**

```bash
git add dist/
git commit -m "chore: verify static build output"
```

---

## Task 2: Add Desktop Platform Module

**Files:**
- Create: `platforms/desktop.ts`
- Modify: `platforms/platforms.ts`

**Interfaces:**
- Consumes: Pinia stores (`useSettings`, `useSchedule`, `useNotifications`, `useEvents`), vue-i18n
- Produces: `useDesktop()` composable for desktop-specific behavior (system notifications via Tauri, audio, window controls)

- [ ] **Step 1: Add `desktop` to AppPlatform enum**

Edit `platforms/platforms.ts`:

```typescript
export enum AppPlatform {
  web = 'web',
  mobile = 'mobile',
  desktop = 'desktop'
}
```

- [ ] **Step 2: Create desktop platform module**

Create `platforms/desktop.ts`:

```typescript
import { reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSettings } from '~~/stores/settings'
import { useSchedule } from '~~/stores/schedule'
import { useNotifications } from '~~/stores/notifications'
import { EventType, useEvents } from '~~/stores/events'

interface SoundSettings {
  source: HTMLAudioElement,
  ready: boolean
}

export function useDesktop () {
  const settingsStore = useSettings()
  const scheduleStore = useSchedule()
  const notificationsStore = useNotifications()
  const eventsStore = useEvents()
  const i18n = useI18n()

  const state = reactive({
    currentSoundSet: null as string | null,
    sounds: {
      work: null as SoundSettings | null,
      shortpause: null as SoundSettings | null,
      longpause: null as SoundSettings | null
    } as Record<string, SoundSettings | null>
  })

  const lastEvent = computed(() => {
    const lastEventArray = eventsStore.events.slice(-1)
    return lastEventArray.length > 0 ? lastEventArray[0] : null
  })

  watch(lastEvent, (newValue) => {
    if (newValue !== null && newValue._event === EventType.TIMER_FINISH) {
      showNotification(scheduleStore.getSchedule[1].type)
    }
  })

  watch(() => settingsStore.audio.soundSet, (newSoundSet) => {
    loadSoundSet(newSoundSet)
  })

  onMounted(() => {
    eventsStore.recordEvent(EventType.APP_STARTED)
    loadSoundSet(settingsStore.audio.soundSet)

    // Desktop visibility handling
    if (typeof document !== 'undefined' && 'hidden' in document) {
      document.addEventListener('visibilitychange', () => {
        settingsStore.registerNewHidden(document.hidden)
      }, false)
      settingsStore.registerNewHidden(document.hidden)
    } else {
      settingsStore.registerNewHidden(false)
    }

    notificationsStore.updateEnabled()
  })

  const loadSoundSet = (setName = settingsStore.audio.soundSet) => {
    if (state.currentSoundSet === setName) { return }

    try {
      for (const key in state.sounds) {
        const newSound = {
          source: new Audio(`/audio/${setName}/${key}.mp3`),
          ready: false
        }

        newSound.source.addEventListener('canplay', () => {
          newSound.ready = true
        })

        state.sounds[key] = newSound
      }

      state.currentSoundSet = setName
    } catch (err) {
      console.warn(err)
    }
  }

  const playSound = (key: string) => {
    if (!state.currentSoundSet) {
      loadSoundSet(settingsStore.audio.soundSet)
    }

    if (state.sounds[key] !== null && settingsStore.permissions.audio) {
      state.sounds[key]!.source.volume = settingsStore.audio.volume
      state.sounds[key]?.source.play()
    }
  }

  const showNotification = (nextState: string) => {
    playSound(nextState)

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || settingsStore.permissions.notifications !== true) { return }

    const notificationActions: NotificationAction[] = []
    if (nextState === 'work') {
      notificationActions.push({
        action: 'ready',
        title: i18n.t('notification.action.ready')
      })
    }

    try {
      new Notification(i18n.t('notification.' + nextState + '.title'), {
        tag: 'FocusTide-SectionNotify',
        body: i18n.t('notification.' + nextState + '.body'),
        actions: notificationActions
      })
    } catch (err) {
      console.warn(err)
    }
  }
}
```

- [ ] **Step 3: Wire desktop platform into app.vue**

In `app.vue`, add the desktop platform import and conditional:

```typescript
import { useDesktop } from '~~/platforms/desktop'
```

And in the platform loading block:

```typescript
if (runtimeConfig.public.PLATFORM === AppPlatform.web) {
  useWeb()
} else if (runtimeConfig.public.PLATFORM === AppPlatform.mobile) {
  useMobile()
} else if (runtimeConfig.public.PLATFORM === AppPlatform.desktop) {
  useDesktop()
}
```

- [ ] **Step 4: Commit**

```bash
git add platforms/platforms.ts platforms/desktop.ts app.vue
git commit -m "feat: add desktop platform module"
```

---

## Task 3: Initialize Tauri v2 in the Project

**Files:**
- Create: `src-tauri/` directory (Tauri Rust backend)
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/main.rs`
- Modify: `package.json` (add Tauri scripts)

**Interfaces:**
- Consumes: `dist/` static output from `nuxi generate`
- Produces: Tauri project structure ready to build

- [ ] **Step 1: Install Tauri CLI**

```bash
cargo install tauri-cli
```

Verify: `cargo tauri --version`

- [ ] **Step 2: Initialize Tauri in the project**

```bash
cd C:\Users\eleph\.ai\temp\FocusTide
cargo tauri init
```

When prompted:
- Window title: `FocusTide`
- Frontend dev server: leave empty (static build)
- Frontend dist directory: `../dist`
- Before dev command: (empty)
- Before build command: `yarn generate`

- [ ] **Step 3: Configure tauri.conf.json**

Edit `src-tauri/tauri.conf.json`:

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
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'"
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

- [ ] **Step 4: Create Rust entry point**

Create `src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: Create Cargo.toml**

Create `src-tauri/Cargo.toml`:

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

- [ ] **Step 6: Create build.rs**

Create `src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 7: Add Tauri scripts to package.json**

Add to `scripts` in `package.json`:

```json
"tauri": "tauri",
"tauri:dev": "tauri dev",
"tauri:build": "tauri build"
```

- [ ] **Step 8: Commit**

```bash
git add src-tauri/ package.json
git commit -m "feat: initialize Tauri v2 desktop wrapper"
```

---

## Task 4: Configure Tauri Icons

**Files:**
- Create: `src-tauri/icons/` directory with app icons

**Interfaces:**
- Consumes: existing `public/icon.png` source
- Produces: icon files in multiple sizes for all platforms

- [ ] **Step 1: Generate icons from source**

```bash
cd C:\Users\eleph\.ai\temp\FocusTide
cargo tauri icon public/icon.png
```

This generates all required icon sizes in `src-tauri/icons/`.

- [ ] **Step 2: Verify icon files exist**

```bash
ls src-tauri/icons/
```

Expected: `icon.ico`, `icon.icns`, `icon.png`, and various size variants

- [ ] **Step 3: Commit**

```bash
git add src-tauri/icons/
git commit -m "feat: add desktop app icons"
```

---

## Task 5: Build and Verify Desktop Executable

**Files:**
- Read: `src-tauri/tauri.conf.json`
- Run: `cargo tauri build`

**Interfaces:**
- Consumes: `dist/` static output + Tauri config
- Produces: Platform-specific executable/installer

- [ ] **Step 1: Build the desktop app**

```bash
cd C:\Users\eleph\.ai\temp\FocusTide
cargo tauri build
```

Expected output path: `src-tauri/target/release/bundle/`

- [ ] **Step 2: Check executable size**

```bash
# Windows:
(Get-ChildItem src-tauri/target/release/bundle/msi/*.msi).Length / 1MB
# Or the .exe:
(Get-ChildItem src-tauri/target/release/focustide.exe).Length / 1MB
```

Expected: <50MB (typically 5-15MB for Tauri apps)

- [ ] **Step 3: Test the executable**

```bash
# Run the built executable
./src-tauri/target/release/focustide.exe
```

Verify: App opens, timer works, sounds play, notifications work, settings persist

- [ ] **Step 4: Commit build artifacts config**

```bash
# Add .gitignore entries for Tauri build artifacts
echo "src-tauri/target/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore Tauri build artifacts"
```

---

## Task 6: Add Cross-Platform Build Scripts

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: Tauri CLI, static build
- Produces: Build scripts for Windows, Linux, macOS

- [ ] **Step 1: Add platform-specific build scripts**

Add to `package.json` `scripts`:

```json
"build:windows": "cargo tauri build --target x86_64-pc-windows-msvc",
"build:linux": "cargo tauri build --target x86_64-unknown-linux-gnu",
"build:macos": "cargo tauri build --target universal-apple-darwin",
"build:all": "cargo tauri build"
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "feat: add cross-platform desktop build scripts"
```

---

## Task 7: Update README and Documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: completed Tauri integration
- Produces: Updated documentation with desktop build instructions

- [ ] **Step 1: Add desktop section to README**

Add after existing sections:

```markdown
## Desktop App

FocusTide can run as a native desktop application using Tauri.

### Building from Source

Prerequisites:
- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)
- Yarn (v4+)

```bash
yarn install
cargo tauri build
```

The executable will be in `src-tauri/target/release/bundle/`.

### Pre-built Binaries

Download the latest release for your platform from the [Releases](https://github.com/Elephant-on-github/FocusTide/releases) page.

- **Windows**: `.msi` installer or `.exe` portable
- **Linux**: `.AppImage` or `.deb`
- **macOS**: `.app` or `.dmg`
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add desktop app build instructions"
```

---

## Task 8: Create GitHub Release Workflow

**Files:**
- Create: `.github/workflows/desktop-build.yml`

**Interfaces:**
- Consumes: Tauri build config, GitHub Actions
- Produces: Automated builds for all platforms on tag push

- [ ] **Step 1: Create workflow file**

Create `.github/workflows/desktop-build.yml`:

```yaml
name: Desktop Build

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  build-desktop:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: windows-latest
            target: x86_64-pc-windows-msvc
          - platform: ubuntu-22.04
            target: x86_64-unknown-linux-gnu
          - platform: macos-latest
            target: universal-apple-darwin

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: src-tauri

      - name: Install frontend dependencies
        run: yarn install --frozen-lockfile

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'FocusTide ${{ github.ref_name }}'
          releaseBody: 'See the assets below for the desktop app.'
          releaseDraft: false
          prerelease: false
          args: --target ${{ matrix.target }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/desktop-build.yml
git commit -m "ci: add desktop build workflow for releases"
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | Verify static build | 10 min |
| 2 | Add desktop platform module | 15 min |
| 3 | Initialize Tauri v2 | 20 min |
| 4 | Configure icons | 5 min |
| 5 | Build & verify executable | 20 min |
| 6 | Cross-platform build scripts | 5 min |
| 7 | Update documentation | 10 min |
| 8 | GitHub release workflow | 10 min |

**Total estimated time:** ~95 minutes

## Key Decisions

1. **Tauri v2 over Electron**: Tauri uses native webview (~5-15MB) vs Electron's bundled Chromium (~150MB+). This easily meets the <50MB target.
2. **Follow existing platform pattern**: The codebase already has `platforms/web.ts` and `platforms/mobile.ts`. Adding `platforms/desktop.ts` is consistent and minimal.
3. **Static build**: `nuxi generate` produces a static site that Tauri serves from disk — no Node.js runtime needed in the executable.
4. **No vue-router needed**: Already removed per issue #370, the app is a single page which simplifies the desktop wrapper.

## Verification

After all tasks:
1. `cargo tauri build` produces an executable <50MB
2. App launches and displays the timer UI
3. Timer countdown works correctly
4. Sounds play on section transitions
5. Notifications fire (desktop notification API)
6. Settings persist across restarts
7. Dark mode toggles correctly
8. All i18n languages work
