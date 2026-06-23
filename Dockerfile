FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 8787

CMD ["npm", "start"]
