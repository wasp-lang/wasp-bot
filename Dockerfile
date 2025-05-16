FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update -qq && \
  # Install dependencies for building node modules (added by fly.io by default)
  apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 \
  # Install dependencies for node-canvas (used by chartjs-node-canvas)
  libcairo2-dev libpango1.0-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production

# Create a non-root user and switch to it
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 discordbot \
  && chown -R discordbot:nodejs /app

USER discordbot

CMD ["npm", "run", "start"]
