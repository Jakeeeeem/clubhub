FROM node:18-alpine

WORKDIR /usr/src/app

# Install git and bash utilities
RUN apk add --no-cache git bash

# Copy package manifests
COPY package*.json ./

# Install ALL dependencies (including devDependencies like nodemon)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

EXPOSE 3000

# Start the server using node directly to avoid nodemon issues in docker
CMD ["node", "server.js"]
