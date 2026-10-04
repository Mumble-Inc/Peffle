FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
ENV PORT=3010
EXPOSE 3010
# Single Node process. Peffle SQLite is process-local; do not scale this image horizontally.
CMD ["npm", "start"]
