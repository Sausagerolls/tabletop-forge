FROM node:20-alpine

# poppler-utils provides pdftoppm — used by the spell-library scanner to
# rasterise PDF pages to PNG before sending them to a vision LLM.
RUN apk add --no-cache poppler-utils

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src ./src

RUN mkdir -p uploads/maps uploads/creatures uploads/spell-pdfs uploads/terrain

EXPOSE 3001

CMD ["node", "src/index.js"]
