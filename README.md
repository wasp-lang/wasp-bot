# Wasp-bot

Wasp bot is a constantly running nodejs server that serves different purposes:
- Acting as a Discord bot for our Discord community.
- Sending Wasp analytics reports.

## Development

### Prerequisites

Copy env.example to .env and fill it with your PostHog API key and Discord bot token.

Both are needed to run bot locally, but only PostHog API key is needed to run just analytics locally.

### Installation

Run `npm install` for the first time or after any changes in npm deps.

### Running

When developing, run the bot server locally with `npm run startBot`. This will actually connect it to the Discord server, so it could affect the production.

Run `npm run calcAnalytics` to run analytics manually and get the report in the CLI.

### Deployment

Deployed instance of server is running on Heroku. Whatever you push to `production` branch automatically gets re-deployed to Heroku.
