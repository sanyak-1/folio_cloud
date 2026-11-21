# 1. Start with a lightweight Node.js environment
FROM node:20-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy the package files and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of the frontend code
COPY . .

# 5. Open port 3000 for React
EXPOSE 3000

# 6. Start the React development server
CMD ["npm", "start"]