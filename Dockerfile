FROM node:13-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY bin/ ./bin
COPY public/ ./public
COPY routes/ ./routes
COPY models/ ./models
COPY app.js .

ENV DB_URL='mongodb+srv://orders:orders@orders.y95zrbf.mongodb.net/?retryWrites=true&w=majority'

EXPOSE 4003

CMD npm start