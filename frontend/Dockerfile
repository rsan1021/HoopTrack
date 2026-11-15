####################################################################
# Base: shared deps install, used by both the dev and build stages.
####################################################################
FROM node:20-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

####################################################################
# Dev stage (default): Vite dev server with hot reload. The dev
# server's own proxy (see vite.config.js) forwards /api/* to the
# FastAPI backend container, so any device on the LAN that loads
# this frontend can reach the API through the same host/port.
####################################################################
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

####################################################################
# Build stage: produce the static production bundle.
####################################################################
FROM base AS build
COPY . .
RUN npm run build

####################################################################
# Prod stage: serve the static bundle with Nginx, which forwards
# /api/* to the backend container (see nginx.conf). Use this stage
# for a production-style deployment:
#   docker build --target prod -t hoops-tracker-frontend:prod ./frontend
####################################################################
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
