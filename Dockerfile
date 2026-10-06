FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run prisma:generate
RUN npm run build:api && npm run build:worker

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps
COPY --from=build /app/dist ./dist

EXPOSE 3000 3001

CMD ["npm", "run", "start:prod:api"]
