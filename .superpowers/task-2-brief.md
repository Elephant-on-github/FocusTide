# Task 2: Add Desktop Platform Module

## Files:
- Create: `platforms/desktop.ts`
- Modify: `platforms/platforms.ts`
- Modify: `app.vue`

## Interfaces:
- Consumes: Pinia stores (`useSettings`, `useSchedule`, `useNotifications`, `useEvents`), vue-i18n
- Produces: `useDesktop()` composable for desktop-specific behavior

## Steps:

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

Create `platforms/desktop.ts` — this should mirror `platforms/web.ts` since desktop uses the same browser APIs (Audio, Notification) but runs in a Tauri webview. The key difference is it's a standalone desktop app, not a PWA.

Copy the structure from `platforms/web.ts` but:
- Keep the same sound loading and notification logic
- Remove PWA-specific concerns (service worker registration is handled in app.vue)
- Add the `useDesktop` export function name

- [ ] **Step 3: Wire desktop platform into app.vue**

In `app.vue`, add the desktop platform import:

```typescript
import { useDesktop } from '~~/platforms/desktop'
```

And in the platform loading block (around line 92-96), add the desktop condition:

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

## Key Context

The existing `platforms/web.ts` handles:
- Sound loading from `/audio/{setName}/{key}.mp3`
- Browser Notification API for section-end alerts
- Visibility change detection
- Pinia store subscriptions for events

The desktop module should be nearly identical since Tauri's webview supports all these browser APIs. The main difference is semantic — it identifies the app as a desktop build.

## Global Constraints

- Target executable size: <50MB
- Must preserve all existing functionality
- Follow existing platform abstraction pattern
- Nuxt static generation for the frontend bundle
