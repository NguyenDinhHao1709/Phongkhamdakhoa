FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json ./
RUN npm install --no-package-lock

FROM dependencies AS build
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-package-lock && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY register-paths.js ./
EXPOSE 5002
CMD ["node", "-r", "./register-paths.js", "dist/main.js"]
