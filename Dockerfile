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
COPY db.js .

EXPOSE 4003

CMD npm start