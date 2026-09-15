# Radio UI

The staff-facing web dashboard for the [Ivugurura](https://github.com/ivugurura) radio platform — a React application used to manage studios, media, and live broadcasts.

It is one of three services that make up the platform:

| Service                                                   | Role                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------- |
| **radio-ui** _(this repo)_                                | Web dashboard consumed by station staff                        |
| [radio-api](https://github.com/ivugurura/radio-backend)   | Application backend — auth, studios, media pipeline, analytics |
| [radio-studio](https://github.com/ivugurura/radio-studio) | Streaming server — live ingest and audio delivery to listeners |

## Features

- **Studio dashboard** — at-a-glance view of what's currently airing and station activity
- **Media management** — upload and organize audio content for a studio's rotation
- **Streaming configuration** — manage the settings that drive a studio's live broadcast
- **Listener insights** — visualized listener and playback analytics
- **Live chat** — real-time messaging alongside a broadcast
- **Authenticated access**, scoped to station staff
- **Internationalized UI**, with language selection built in
- **Typed GraphQL data layer** — API types and hooks are generated from the backend schema rather than hand-written

## Tech Stack

- React with TypeScript, bundled with Vite
- Apollo Client over a GraphQL API, with generated types/hooks via GraphQL Code Generator
- Material UI for components and theming

## Requirements

Running the dashboard requires a recent Node.js runtime and a package manager compatible with the project's lockfile, plus access to a running instance of the backend API this UI talks to.

## Getting Started

At a high level:

1. Install dependencies with your package manager of choice.
2. Provide the app with its runtime configuration (backend API location and related settings) via environment variables.
3. Generate the GraphQL types/hooks from the backend schema before your first run, and again whenever the schema changes.
4. Start the development server.

A production build is produced through the standard Vite build pipeline; see `package.json` for the available scripts.

## Maintainer

[Jean d'Amour AKIMANIZANYE](https://github.com/AJAkimana)
