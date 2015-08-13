FROM node:latest
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app
EXPOSE 8000
ENTRYPOINT [ "npm", "start"]
CMD ["8000", "error", "PRO"]
