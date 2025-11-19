# Wasp-bot

Wasp bot is a constantly running nodejs server that serves different purposes:

- Acting as a Discord bot for our Discord community.
- Sending Wasp analytics reports.

## Development

### Prerequisites

Copy .env.example to .env and fill it with your PostHog API key and Discord bot token.

Both are needed to run bot locally, but only PostHog API key is needed to run just analytics locally.

### Installation

Run `npm install` for the first time or after any changes in npm deps.

Also, run `npm run prepare` to set up pre-commit hooks (for stuff like code formatting and linting!).

### Running

When developing, run the bot server locally with `npm run buildAndStartBot`. This will actually connect it to the Discord server, so you will have two bots running at the same time -> production one, and your development one. So test quickly what you need and then shut it down.

#### Local Analytics Scripts

Run analytics scripts locally to generate reports in the CLI:

- `npm run buildAndRunGeneralAnalytics` (or `npm run generalAnalytics` if already built) - Runs general Wasp analytics reports (daily, weekly, monthly, all-time). These are the same analytics as exposed by the bot to the Discord server, but useful because you can easily tweak the script temporarily for more specific results.
- `npm run buildAndRunQuestionsAnalytics` (or `npm run questionsAnalytics` if already built) - Analyzes Questions forum threads. E.g. it prints thread authors grouped by number of threads created in the last year.

### Deployment

The bot is deployed to [Fly](https://fly.io/). The `fly.toml` file contains the configuration for the deployment. The Fly deployoment uses the `Dockerfile` to build the image.

The bot is deployed automatically on every push to the `production` branch. You can also deploy with the Fly CLI by running `fly deploy`.

The Fly.io server on which wasp-bot is deployed has a persistent volume attached to it called `wasp_bot_storage` mounted at `/data` dir, in order to persist the cached analytics events from Posthog between deployments.
Our Wasp-bot app provides the `WASP_ANALYTICS_CACHED_EVENTS_JSON_PATH` environment variable, which in this case we set to point to `/data/wasp-analytics-cached-events.json`.

You can check production app logs with `fly logs` and SSH into the app container with `fly ssh console`.
