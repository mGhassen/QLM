# syntax=docker.io/docker/dockerfile:1
FROM node:24-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
ENV CI=true
# Install global dependencies
RUN corepack enable pnpm
RUN npm install -g turbo

# Copy workspace configuration files (for better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY turbo.json tsconfig.json ./

# Copy source code
COPY packages/ ./packages/
COPY tooling/ ./tooling/
COPY apps/web/ ./apps/web/

# Install dependencies using lockfile
RUN echo "node-linker=hoisted" >> .npmrc
RUN pnpm install --frozen-lockfile
RUN npm rebuild lightingcss --build-from-source --verbose

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# web build reads git SHA from repo
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

# Install global dependencies for the build
RUN corepack enable pnpm
RUN npm install -g turbo

# Copy over everything including dependencies
COPY --from=deps /app ./

# Accept build arguments for VITE_ variables
ARG VITE_APP_VERSION
ARG VITE_APP_GIT_HASH
ARG VITE_SITE_URL
ARG VITE_SUPABASE_URL
ARG VITE_AUTH_PASSWORD
ARG VITE_DATABASE_PROVIDER
ARG VITE_DEFAULT_THEME_MODE
ARG VITE_DISPLAY_TERMS_AND_CONDITIONS_CHECKBOX
ARG VITE_PRODUCT_NAME
ARG VITE_SITE_DESCRIPTION
ARG VITE_SITE_TITLE
ARG VITE_THEME_COLOR
ARG VITE_WORKING_DIR
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SENTRY_DSN
ARG VITE_API_URL
ARG VITE_CHAT_API_URL

# Set as environment variables for the build
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_GIT_HASH=$VITE_APP_GIT_HASH
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_AUTH_PASSWORD=$VITE_AUTH_PASSWORD
ENV VITE_DATABASE_PROVIDER=$VITE_DATABASE_PROVIDER
ENV VITE_DEFAULT_THEME_MODE=$VITE_DEFAULT_THEME_MODE
ENV VITE_DISPLAY_TERMS_AND_CONDITIONS_CHECKBOX=$VITE_DISPLAY_TERMS_AND_CONDITIONS_CHECKBOX
ENV VITE_PRODUCT_NAME=$VITE_PRODUCT_NAME
ENV VITE_SITE_DESCRIPTION=$VITE_SITE_DESCRIPTION
ENV VITE_SITE_TITLE=$VITE_SITE_TITLE
ENV VITE_THEME_COLOR=$VITE_THEME_COLOR
ENV VITE_WORKING_DIR=$VITE_WORKING_DIR
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CHAT_API_URL=$VITE_CHAT_API_URL

# Disable telemetry during build
ENV TURBO_TELEMETRY_DISABLED=1
ENV DO_NOT_TRACK=1

# Build the project
RUN turbo run build --filter=web...

# Some builds output to `dist/` (default Vite) instead of `build/`.
# Normalize to `apps/web/build` for the runtime image.
RUN if [ -d /app/apps/web/build ]; then \
      echo "Found /app/apps/web/build"; \
    elif [ -d /app/apps/web/dist ]; then \
      echo "Found /app/apps/web/dist; renaming to build"; \
      mv /app/apps/web/dist /app/apps/web/build; \
    else \
      echo "No build output found in apps/web"; \
      ls -la /app/apps/web; \
      exit 1; \
    fi

# Build extensions
RUN pnpm extensions:build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Accept build arguments for VITE_ variables (needed at runtime)
ARG VITE_APP_VERSION
ARG VITE_APP_GIT_HASH
ARG VITE_SITE_URL
ARG VITE_SUPABASE_URL
ARG VITE_AUTH_PASSWORD
ARG VITE_DATABASE_PROVIDER
ARG VITE_DEFAULT_THEME_MODE
ARG VITE_DISPLAY_TERMS_AND_CONDITIONS_CHECKBOX
ARG VITE_PRODUCT_NAME
ARG VITE_SITE_DESCRIPTION
ARG VITE_SITE_TITLE
ARG VITE_THEME_COLOR
ARG VITE_WORKING_DIR
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SENTRY_DSN
ARG VITE_API_URL
ARG VITE_CHAT_API_URL

# Set as environment variables for runtime
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_GIT_HASH=$VITE_APP_GIT_HASH
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_AUTH_PASSWORD=$VITE_AUTH_PASSWORD
ENV VITE_DATABASE_PROVIDER=$VITE_DATABASE_PROVIDER
ENV VITE_DEFAULT_THEME_MODE=$VITE_DEFAULT_THEME_MODE
ENV VITE_DISPLAY_TERMS_AND_CONDITIONS_CHECKBOX=$VITE_DISPLAY_TERMS_AND_CONDITIONS_CHECKBOX
ENV VITE_PRODUCT_NAME=$VITE_PRODUCT_NAME
ENV VITE_SITE_DESCRIPTION=$VITE_SITE_DESCRIPTION
ENV VITE_SITE_TITLE=$VITE_SITE_TITLE
ENV VITE_THEME_COLOR=$VITE_THEME_COLOR
ENV VITE_WORKING_DIR=$VITE_WORKING_DIR
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CHAT_API_URL=$VITE_CHAT_API_URL

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 rr
RUN mkdir -p /home/rr && chown rr:nodejs /home/rr
ENV HOME=/home/rr

# Install pnpm for recreating symlinks
RUN corepack enable pnpm

# Copy root package.json for workspace configuration (pnpm needs this for overrides)
COPY --from=builder /app/package.json ./package.json

# Copy web app package.json separately
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

# Copy pnpm files needed for install
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy .npmrc from builder to match lockfile configuration
COPY --from=builder /app/.npmrc ./.npmrc

# Copy the build output and node_modules
COPY --from=builder /app/apps/web/build ./apps/web/build
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/node_modules ./node_modules
ENV CI=true

# Rehydrate pnpm symlinks for runtime resolution.
# (The copied node_modules includes the pnpm store, but not always the top-level
# package links Node's resolver expects.)
RUN pnpm -r install --frozen-lockfile --prod --ignore-scripts

# Copy i18n locale files to build output for runtime dynamic imports
# The resolver uses relative imports: ./locales/${language}/${namespace}.json
# Copy to both server and client builds since resolver can run in both contexts
COPY --from=builder /app/apps/web/src/lib/i18n/locales ./apps/web/build/server/src/lib/i18n/locales
COPY --from=builder /app/apps/web/src/lib/i18n/locales ./apps/web/build/client/src/lib/i18n/locales

# Create symlinks for @duckdb packages (
RUN mkdir -p node_modules/@duckdb && \
    for pkg in node-api node-bindings; do \
      for dir in node_modules/.pnpm/@duckdb+${pkg}@*/node_modules/@duckdb/${pkg}; do \
        [ -d "$dir" ] && ln -sf "../$(echo "$dir" | sed 's|^node_modules/||')" node_modules/@duckdb/${pkg} && break; \
      done; \
    done

# Replace root package.json with web app's package.json for runtime (npm start)
COPY --from=builder /app/apps/web/package.json ./package.json

RUN npm -g install cross-env @react-router/serve

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Switch to non-root user
USER rr

# Set server port and host
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=90s --timeout=5s --retries=3 \
CMD curl -f http://localhost:3000/healthcheck || exit 1

# Start the server
CMD ["npm", "start"]