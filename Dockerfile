FROM node:9.2.0

# node関連設定
WORKDIR /app 
COPY     package.json /app
COPY app/script/app.js /app/script/app.js
RUN npm install

# スクリプト配置用ディレクトリ作成
RUN mkdir -p /app/script

WORKDIR /app

CMD ["node", "script/app.js"]

