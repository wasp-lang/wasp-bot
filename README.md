# Wasp-bot

Wasp bot is a constantly running nodejs server that serves different purposes:
- Acting as a Discord bot for our Discord community.
- Sending Wasp analytics reports.

## Development

### Prerequisites

Copy env.example to .env and fill it with your PostHog API key and Discord bot token. If you are only running `analytics.js` you can leave the Discord token empty.

### Running

When developing, run server locally with `node src/bot.js`. This will actually connect it to the Discord server, so it will affect the production.

Deployed instance of server is running on Heroku. Whatever you push to `production` branch automatically gets re-deployed to Heroku.

Run `npm run testAnalytics` to run analytics manually and get the report in the CLI.
