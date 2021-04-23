# Wasp-bot

Wasp bot is a constantly running nodejs server that serves different purposes:
- Acting as a Discord bot for our Discord community.
- Sending Wasp analytics reports.

When developing, run server locally with `DISCORD_BOT_TOKEN=<discord_bot_token> WASP_POSTHOG_KEY=<thekey> node src/bot.js`. This will actually connect it to the Discord server, so it will affect the production.

Deployed instance of server is running on Heroku. Whatever you push to `production` branch automatically gets re-deployed to Heroku.

`WASP_POSTHOG_KEY=<thekey> node src/analytics.js` to run analytics manually and get the report in the CLI.
