# Use official Node.js LTS image as base
FROM node:18

# Create app directory inside container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json if available
COPY package*.json ./

# Install dependencies (only production deps)
RUN npm install --production

# Copy all project files (including index.html and index.js)
COPY . .

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Start the Node.js server
CMD ["node", "index.js"]
