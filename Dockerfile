FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
RUN cp -r node_modules /node_modules

FROM node:18-alpine
RUN apk add --no-cache tzdata
WORKDIR /app
COPY --from=builder /node_modules ./node_modules
COPY . .
RUN addgroup -S zynox && adduser -S zynox -G zynox && \
    chown -R zynox:zynox /app
USER zynox
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1
CMD ["node", "src/server.js"]
