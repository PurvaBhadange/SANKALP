FROM node:20-alpine

WORKDIR /frontend

# Copy dependency definition
COPY package.json ./

# Install npm packages
RUN npm install

# Copy application files
COPY . .

# Expose Next.js server port
EXPOSE 3000

# Run in development mode for live-reload support
CMD ["npm", "run", "dev"]
