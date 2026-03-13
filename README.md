# Likelab App

Internal mobile application for the Likelab creator platform, built with Expo, React Native, and Supabase.

## Confidentiality

This repository is private and intended for authorized Likelab team members and approved collaborators only.

- Do not commit secrets, tokens, production credentials, or exported user data.
- Do not share screenshots, logs, or recordings that may expose internal workflows or personal data.
- Treat all environment configuration, backend endpoints, and operational details as internal information unless explicitly approved for external sharing.

## Purpose

Likelab App supports the creator-side mobile experience for onboarding and ongoing platform use. The app currently covers:

- Authentication and account creation
- Creator onboarding and profile completion gating
- Campaign discovery and campaign detail views
- Applications and deliverables workflows
- Overview, notifications, and profile-related experiences

## Technology Stack

- Expo SDK 54
- React Native 0.81
- React 19
- `expo-router` for app navigation
- Supabase for authentication and backend integration
- TanStack Query for client-side data fetching and caching
- Expo Secure Store for persisted auth session storage

## Repository Structure

```text
app/          Route-based screens and layouts via expo-router
features/     Domain logic by feature area (auth, campaigns, profile, onboarding, etc.)
components/   Shared UI components
lib/          Shared integrations and low-level utilities
design/       Design assets and visual references
assets/       Static assets such as icons and images
scripts/      Local project utility scripts
```

## Getting Started

### Prerequisites

- Node.js 20.x or later recommended
- npm 10.x or later
- Xcode for iOS simulator work
- Android Studio for Android emulator work
- Expo CLI tooling via `npx expo`

### Installation

```bash
npm install
cp .env.example .env
```

Populate `.env` with project-specific values before starting the app.

### Run Locally

```bash
npm run start
```

Platform-specific commands:

```bash
npm run ios
npm run android
npm run web
```

## Environment Variables

The app depends on public Expo environment variables for Supabase connectivity and auth redirect behavior.

| Variable | Required | Description |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL used by the mobile client and edge function calls. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key used by the client application. |
| `EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN` | Yes | Web origin used during signup email verification link generation. |
| `EXPO_PUBLIC_WEB_URL` | No | Legacy fallback if `EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN` is not set. |

Recommended values by environment:

- Local: `http://localhost:3000` or the relevant local web environment
- Staging: `https://staging.likelab.se`
- Production: `https://likelab.se`

Auth redirect origin fallback order in the app:

1. `EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN`
2. `EXPO_PUBLIC_WEB_URL`
3. `https://likelab.se`

## Authentication and Backend Notes

- Supabase auth session persistence is handled through Expo Secure Store.
- Signup currently sends a web-origin-based verification target to the `signup-creator` edge function.
- TikTok profile verification is performed through the `fetch-tiktok-stats` Supabase edge function.
- Mobile deep-link based verification is not yet the end-to-end default flow.

## Application Flow

At a high level, the app enforces creator access through a staged onboarding model:

1. User signs up or logs in.
2. Creator profile completeness is evaluated.
3. Incomplete profiles are gated until required profile data is provided.
4. Submitted creators can remain in pending or rejected review states.
5. Approved creators proceed into the main app experience.

This behavior is implemented primarily in the onboarding and profile feature modules.

## Available Scripts

```bash
npm run start          # Start Expo development server
npm run ios            # Launch iOS target
npm run android        # Launch Android target
npm run web            # Launch web target
npm run lint           # Run linting
npm run reset-project  # Local project reset utility
```

## Development Expectations

- Keep feature logic within `features/` and avoid spreading backend logic across route files.
- Prefer existing domain hooks and API modules before introducing duplicate data access paths.
- Store secrets only in local environment files or approved secret management systems.
- Validate auth, onboarding, and profile gating flows after changes because these are core access-control paths.

## Security and Privacy

- Never commit `.env` files or production credentials.
- Avoid logging tokens, auth payloads, or personal data in development builds.
- Sanitize screenshots and test accounts before sharing within tickets, pull requests, or internal docs.
- Coordinate any schema, auth, or edge-function contract changes with the backend owner before release.

## Known Limitations

- Email verification redirect is currently web-origin based rather than fully mobile deep-link based.
- No dedicated automated test suite is configured in this repository at the time of writing.

## Troubleshooting

- If the app fails at startup, verify `.env` values first.
- If signup verification links are incorrect, confirm `EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN`.
- If authenticated state behaves unexpectedly, clear the app install or secure storage and retry.
- If data does not load, verify the Supabase project URL, anon key, and relevant edge function availability.

## Ownership

This README is intended to document the current operational baseline for the private Likelab mobile app repository. For architecture changes, auth flow updates, or release-process changes, update this document in the same change set.
