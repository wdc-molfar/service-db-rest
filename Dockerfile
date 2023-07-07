FROM node:16 as builder
RUN apt update -y
RUN apt install git -y
RUN apt install nano -y

ENV NODE_ENV=production
WORKDIR /data
COPY . .

RUN npm install

CMD ["npm", "start"]
