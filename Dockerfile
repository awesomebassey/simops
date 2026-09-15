FROM node:22-bookworm-slim AS base

RUN apt-get update -y \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/simulator/package.json apps/simulator/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install
COPY . .
RUN npm run build -w @simops/contracts && npm run prisma:generate -w @simops/api

FROM base AS api
RUN npm run build -w @simops/api
EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --schema apps/api/prisma/schema.prisma && node apps/api/dist/main.js"]

FROM base AS worker
RUN npm run build -w @simops/worker
CMD ["node", "apps/worker/dist/main.js"]

FROM base AS simulator
EXPOSE 4100
CMD ["npm", "run", "serve", "-w", "@simops/simulator"]

FROM base AS web
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_WS_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
RUN npm run build -w @simops/web
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@simops/web"]
