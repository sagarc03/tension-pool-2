# Contributing to Tension Pool 2

## Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) v10+
- [Docker](https://www.docker.com/) (for running Foundry VTT locally)
- A [Foundry VTT](https://foundryvtt.com/) license

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/sagarc03/tension-pool-2.git
   cd tension-pool-2
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create a `.env` file from the template:

   ```bash
   cp .env.example .env
   ```

4. Fill in your Foundry credentials in `.env`:

   ```
   FOUNDRY_USERNAME=your-username
   FOUNDRY_PASSWORD=your-password
   FOUNDRY_RELEASE_URL=https://...your-foundry-download-url...
   ```

   You can find your release URL on the [Foundry VTT website](https://foundryvtt.com/) under your purchased licenses.

## Local Development

Run two processes — one for the build watcher, one for Foundry:

1. Start the Vite build watcher:

   ```bash
   pnpm dev
   ```

   This compiles TypeScript and CSS into `build/` and rebuilds on file changes.

2. In a separate terminal, start Foundry VTT:

   ```bash
   docker compose up
   ```

   Foundry will be available at [http://localhost:30000](http://localhost:30000). The first run downloads Foundry (cached in a Docker volume for subsequent runs).

3. Enable the "Tension Pool 2" module in your Foundry world's module settings.

4. After making code changes, reload Foundry in your browser to pick them up.

## Running Tests

```bash
pnpm test          # Single run
pnpm test:watch    # Watch mode
```

## Releasing

Releases are automated via GitHub Actions. To create a release:

1. Update the version in `package.json`.
2. Commit the version bump.
3. Tag the commit and push:

   ```bash
   git tag v1.0.0
   git push origin main --tags
   ```

4. The GitHub Actions workflow will run tests, build the module, and create a GitHub Release with `module.json` and `module.zip` attached.
