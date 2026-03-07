FROM node:lts

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

RUN ls

EXPOSE 8080
CMD ["npm", "start"]
