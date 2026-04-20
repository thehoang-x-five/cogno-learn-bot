FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Fresh install without any cache
RUN rm -rf node_modules package-lock.json && \
    npm install --silent --no-audit --no-fund

# Copy source code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]