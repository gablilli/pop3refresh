FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY server.js ./
COPY public ./public

# Create volume for persistent config
VOLUME /app/data

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
