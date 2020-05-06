# TweetDeck-Scraping

TweetDeck + puppeteer + mongodbでTweetを保存する。

## Init

secret.sample.envを参考に、secret.envを設定する。
ID, PASSWORD等を設定する。

```
$ cp secret.sample.env secret.env
```

うまくいかない場合は、ブラウザでTweetDeckを開き、COOKIEから必要な情報を引っ張ってくる。


## RUN

```
$ docker-compose up -d
```

localhost:8081にmongo-expressが展開されているので、内容を確認できる。
