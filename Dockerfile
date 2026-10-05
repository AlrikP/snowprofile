# The app image runs the production build with Bun; the caddy image serves its static files
# (docs/architecture.md, "Environments and deployment").

FROM oven/bun:1.4.2 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
# The scripts are bundled next to the server, so they find the libSQL addon Nitro traced
# into .output/server/node_modules and the image needs no other node_modules.
RUN bun run i18n:compile && bun run build && bun run build:scripts

FROM oven/bun:1.4.2-slim AS app
WORKDIR /app
RUN mkdir /data && chown bun:bun /data
COPY --from=build /app/.output/ .output/
COPY drizzle/ drizzle/
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL=file:/data/snowprofile.db
USER bun
EXPOSE 3000
# Settings come from the container's environment, never from files in the image.
CMD ["bun", "--no-env-file", ".output/server/scripts/start.js"]

FROM caddy:2.11.4 AS caddy
COPY --from=build /app/.output/public/ /srv/snowprofile/
COPY deploy/compose/Caddyfile /etc/caddy/Caddyfile
