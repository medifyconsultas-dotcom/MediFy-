FROM node:18-alpine

WORKDIR /app

# install build dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production --silent

# copy source
COPY . .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "start"]
