FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# The World Dungeon Crawler Sheet, served at /crawler/ (see crawler-sheet/README.md).
RUN npx vite build --config crawler-sheet/vite.config.js

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
