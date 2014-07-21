FROM	google/nodejs

WORKDIR	/app

ADD	package.json /app/
RUN	npm install

RUN	mkdir lib

EXPOSE	8080

CMD	["cat /etc/hosts"]

#ENTRYPOINT ["node", "/app/lib/proxy/server.js"]
