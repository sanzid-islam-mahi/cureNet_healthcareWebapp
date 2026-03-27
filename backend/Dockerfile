FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY tests ./tests

RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=5000
ENV UPLOADS_DIR=/app/uploads

EXPOSE 5000

CMD ["npm", "start"]
