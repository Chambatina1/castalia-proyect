FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
RUN npx prisma generate
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
ENV NODE_ENV=production
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"
EXPOSE 10000
CMD ["npx", "next", "start", "-p", "10000"]