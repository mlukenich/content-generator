# Use the official Bun image as a base
FROM oven/bun:latest

# Set the working directory in the container
WORKDIR /usr/src/app

# Install necessary dependencies for Remotion (Puppeteer/Chromium) and FFmpeg
# This is the most critical part for ensuring Remotion can render videos headless.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libnss3 \
    libxss1 \
    libasound2 \
    libdbus-glib-1-2 \
    libgtk-3-0 \
    libnspr4 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxtst6 \
    libatk-bridge2.0-0 \
    libcups2 \
    libgbm1 \
    libatspi2.0-0 \
    libpangocairo-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and bun.lock
COPY package.json bun.lock ./

# Install only production dependencies
RUN bun install --production

# Copy the rest of the application source code
COPY . .

# The default command to start the application (can be overridden in docker-compose)
CMD ["bun", "run", "src/index.ts"]
