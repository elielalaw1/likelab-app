# Likelab Creator Mobile (Expo)

Creator-only mobile app for Likelab, built with Expo SDK 54, `expo-router`, and Supabase.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your env file from template:

```bash
cp .env.example .env
```

3. Start the app:

```bash
npx expo start
```

## Environment Variables

### Required

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Auth Redirect Origin

- `EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN`

This value is sent to the `signup-creator` edge function as `origin` so email verification links are generated against the correct web domain.

Fallback order used by mobile auth code:

1. `EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN`
2. `EXPO_PUBLIC_WEB_URL`
3. `https://likelab.se` (final production fallback only when no env is set)

### Recommended values by environment

- Local development: `EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN=http://localhost:3000` (or your local web app URL)
- Staging: `EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN=https://staging.likelab.se`
- Production: `EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN=https://likelab.se`

Use `EXPO_PUBLIC_WEB_URL` only as a backup for older configs.

## TODO (Auth)

Current signup verification redirect is web-origin based.  
Future mobile deep linking should replace this with a dedicated app deep-link auth verification flow.
