FROM node:20-slim AS builder

WORKDIR /app

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

# Command to run the app
CMD ["npm", "run", "start"]
