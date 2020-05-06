console.log("TweetDeck Scraping")

var DB_NAME = 'tweetdeck';
const puppeteer = require('puppeteer');
const BigNumber = require('bignumber.js');
const mongoose = require('mongoose');
const model = require('./model.js');

const cookies = JSON.parse(process.env.TWITTER_COKKIES, 'utf-8');

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://root:example@mongo:27017/tweetdeck?authSource=admin",
  {
    useCreateIndex: true,
    useUnifiedTopology: true,
    useNewUrlParser: true
  }).catch(e => {
    console.error("MongoDB Connection Error:", e);
  });

let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () { console.log("mongoDB Coneected!"); });


(async () => {
  // puppeteer の起動
  // これを書いている人は Docker で起動しているので root ユーザーでの実行となるのでそのためにいくつか設定をしている
  // 一般ユーザー権限で実行する場合は no-sandbox とかは不要
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  for (let cookie of cookies) {
    await page.setCookie(cookie);
  }

  await page.goto("https://twitter.com/login?hide_message=true&redirect_after_login=https%3A%2F%2Ftweetdeck.twitter.com%2F%3Fvia_twitter_login%3Dtrue", { waitUntil: "domcontentloaded" });

  // Twitter のログインページにはフォームがいくつもありどれに入れたらいいのかよく分かってないので面倒なので全部に入力してます
  await page.evaluate(() => document.querySelectorAll("input[name='session[username_or_email]']").forEach((n) => n.value = process.env.TWITTER_SCREEN_NAME));
  await page.evaluate(() => document.querySelectorAll("input[name='session[password]']").forEach((n) => n.value = process.env.TWITTER_PASSWORD));
  await page.evaluate(() => {
    // ここで 2 秒待っているのは生活の知恵みたいなもんです、こうするとうまくいく
    setTimeout(() => {
      // document.querySelectorAll("button.submit").forEach((n)=> n.click())
      document.querySelectorAll("div[role='button']").forEach((n) => n.click())
    }, 2000);
  });

  // await page.screenshot({ "path": "script/login.png" });

  var id = new BigNumber(0);

  page.on("response", async (res) => {
    const url = res.url();

    // home timeline だけ処理するようにします
    if (!url.match(/api\.twitter\.com/)) { return }
    if (!url.match(/home_timeline.json/) && !url.match(/by_friends.json/)) { return }
    if ((await res.text()) === "") { return true }

    try {
      // console.log("tweet received");
      const data = await res.json();
      // あとはこの JSON を煮るなり焼くなりするだけ
      // ぼくは Slack の Incoming Webhook に送り付けて Twitter IRC Gateway みたいな環境を再現しています
      //data_wo_syori_suru_nanrakano_funcion(data);
      if (url.match(/home_timeline.json/)) {
        for (var item in data) {
          var tw = data[item];
          var us = data[item]["user"];

          // RTはリツイートの情報を登録する。
          if (!data[item]["full_text"].indexOf("RT")) {
            //
            var u0 = {
              uid: us["id_str"],
              name: us["name"],
              screen_name: us["screen_name"],
              location: us["location"],
              description: us["description"],
              followers_count: us["followers_count"],
              friends_count: us["friends_count"],
              created_at: new Date(us["created_at"]),
              observed_at: new Date(),
              profile_image_url: us["profile_image_url_https"]
            };
            // upsert
            model.User.updateOne({ uid: us["id_str"] }, u0, { upsert: true }, function (err) {
              //if (err) console.log(err);
            });

            // RTはRT先のツイートに切り替え
            tw = data[item]["retweeted_status"];
            us = tw["user"];
          }
          var u1 = {
            uid: us["id_str"],
            name: us["name"],
            screen_name: us["screen_name"],
            location: us["location"],
            description: us["description"],
            followers_count: us["followers_count"],
            friends_count: us["friends_count"],
            created_at: new Date(us["created_at"]),
            observed_at: new Date(),
            profile_image_url: us["profile_image_url_https"]
          };

          // upsert
          model.User.updateOne({ uid: us["id_str"] }, u1, { upsert: true }, function (err) {
            //if (err) console.log(err);
          });

          var t1 = {
            id: tw["id_str"],
            created_at: new Date(tw["created_at"]),
            observed_at: new Date(),
            full_text: tw["full_text"],
            url: tw["entities"]["urls"]["expanded_url"],
            source: tw["source"],
            uid: tw["user"]["id_str"],
            in_reply_to_status_id: tw["in_reply_to_status_id_str"],
            in_reply_to_user_id: tw["in_reply_to_user_id_str"],
            retweeted: tw["retweeted"],
            is_quote_status: tw["is_quote_status"],
            retweet_count: tw["retweet_count"],
            favorite_count: tw["favorite_count"]
          };

          // upsert
          model.Tweet.updateOne({ id: tw["id_str"] }, t1, { upsert: true }, function (err) {
            if (err) console.log(err);
          });


        }
      } else if (url.match(/by_friends.json/)) {
        for (var item in data) {
          // console.log(data[item]);
          //console.log("[Activity]" + data[item]["targets"][0]["full_text"]);
          // console.log("[Activity]" + data);
        }
      }
    } catch (e) {
      console.log(url);
      console.log(e);
      console.log(await res.text());
    }
  });

})();
