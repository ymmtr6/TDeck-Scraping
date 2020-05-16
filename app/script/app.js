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
db.once('open', function () { console.log("mongoDB Connected!"); });

function write_user(user) {
  var u1 = {
    uid: user["id_str"],
    name: user["name"],
    screen_name: user["screen_name"],
    location: user["location"],
    description: user["description"],
    followers_count: user["followers_count"],
    friends_count: user["friends_count"],
    created_at: new Date(user["created_at"]),
    observed_at: new Date(),
    profile_image_url: user["profile_image_url_https"]
  };

  // upsert
  model.User.updateOne({ uid: user["id_str"] }, u1, { upsert: true }, function (err) {
    if (err) console.log(err);
  });
}

function write_tweet(tweet) {
  var t1 = {
    id: tweet["id_str"],
    created_at: new Date(tweet["created_at"]),
    observed_at: new Date(),
    full_text: tweet["full_text"],
    url: tweet["entities"]["urls"]["expanded_url"],
    source: tweet["source"],
    uid: tweet["user"]["id_str"],
    in_reply_to_status_id: tweet["in_reply_to_status_id_str"],
    in_reply_to_user_id: tweet["in_reply_to_user_id_str"],
    retweeted: tweet["retweeted"],
    is_quote_status: tweet["is_quote_status"],
    retweet_count: tweet["retweet_count"],
    favorite_count: tweet["favorite_count"]
  };

  // upsert
  model.Tweet.updateOne({ id: tweet["id_str"] }, t1, { upsert: true }, function (err) {
    if (err) console.log(err);
  });
}

function write_favorite(act) {
  var action = act;
  var from = action["sources"][0]["id_str"];
  var to = action["targets"][0]["id_str"];
  var created = new Date(action["created_at"]);
  var fav = {
    created_at: created,
    observed_at: new Date(),
    max_position: action["max_position"],
    min_position: action["min_position"],
    target_tweets: action["targets"].map(item => item["id_str"]),
    targets_size: action["targets_size"],
    sources: action["sources"].map(item => item["id_str"]),
    sourcss_size: action["sources_size"],
    from: from,
    to: to,
  };
  write_user(action["sources"][0]);
  model.Favorite.updateOne({ created_at: created, to: to, from: from }, fav, { upsert: true }, function (err) {
    if (err) console.log(err);
  });
}

function write_followed(fol) {
  var from = fol["sources"][0]["id_str"];
  var to = fol["targets"][0]["id_str"];
  var created = new Date(fol["created_at"]);
  var follow = {
    created_at: created,
    observed_at: new Date(),
    max_position: fol["max_position"],
    min_position: fol["min_position"],
    target_users: fol["targets"].map(item => item["id_str"]),
    targets_size: fol["targets_size"],
    sources: fol["sources"].map(item => item["id_str"]),
    sources_size: fol["sources_size"],
    from: from,
    to: to
  };
  fol["sources"].forEach(function (item) {
    write_user(item);
  });
  fol["targets"].forEach(function (item) {
    write_user(item);
  });
  model.Follow.updateOne({ created_at: created, to: to, from: from }, follow, { upsert: true }, function (err) {
    if (err) console.log(err);
  });
}

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
    // if (!url.match(/api\.twitter\.com/)) { return }
    if (!url.match(/home_timeline.json/)
      && !url.match(/by_friends.json/)
      && !url.match(/universal.json/)
    ) { return }
    if ((await res.text()) === "") { return true }

    try {
      // console.log("tweet received");
      const data = await res.json();
      // あとはこの JSON を煮るなり焼くなりするだけ
      //data_wo_syori_suru_nanrakano_funcion(data);
      if (url.match(/home_timeline.json/)) {
        for (var item in data) {
          var tw = data[item];
          var us = data[item]["user"];

          // RTはリツイートの情報を登録する。
          if (!data[item]["full_text"].indexOf("RT")) {
            //
            write_user(us);

            // RTはRT先のツイートに切り替え
            tw = data[item]["retweeted_status"];
            us = tw["user"];
          }
          write_user(us);
          write_tweet(tw);
        }
      } else if (url.match(/by_friends.json/)) {
        for (var item in data) {
          //console.log(data[item]);
          if (data[item]["action"] == "favorite") {
            // favorite
            write_favorite(data[item]);
          } else if (data[item]["action"] == 'follow') {
            write_followed(data[item]);
          } else {
            console.log(data[item]);
          }
        }
      } else if (url.match(/universal.json/)) {
        console.log(url);
        for (var item in data["modules"]) {
          tw = data["modules"][item]["status"]["data"];
          write_tweet(tw);
          write_user(tw["user"]);
        }
      } else {
        console.log(url);
      }
    } catch (e) {
      console.log(url);
      console.log(e);
      //console.log(await res.text());
    }
  });

})();
