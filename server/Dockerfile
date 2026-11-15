FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
RUN mkdir -p /app/uploads && chown -R node:node /app
EXPOSE 5000
USER node
CMD ["npm", "start"]
