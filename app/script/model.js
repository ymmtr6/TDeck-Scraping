var mongoose = require("mongoose")
var Schema = mongoose.Schema;

var User = new Schema({
    uid: { type: String, require: true, unique: true },
    name: String,
    screen_name: String,
    location: String,
    description: String,
    url: String,
    followers_count: Number,
    created_at: { type: Date, default: Date.now },
    observed_at: { type: Date, default: Date.now },
    friends_count: Number,
    profile_image_url: String
});

var Tweet = new Schema({
    id: { type: String, require: true, unique: true },
    created_at: { type: Date, default: Date.now },
    observed_at: { type: Date, default: Date.now },
    full_text: String,
    url: String,
    source: String,
    uid: {
        type: String,
        ref: 'User'
    },
    in_reply_to_status_id: { type: String },
    in_reply_to_user_id: { type: String },
    in_reply_to_screen_name: String,
    retweeted: Boolean,
    is_quote_status: Boolean,
    retweet_count: Number,
    favorite_count: Number,

});

var Favorite = new Schema({
    created_at: { type: Date, require: true },
    observed_at: { type: Date, default: Date.now },
    max_position: { type: String },
    min_position: { type: String },
    target_tweets: { type: [String], ref: 'Tweet' },
    targets_sige: Number,
    sources: { type: [String], ref: 'User' },
    sources_size: Number,
    from: { type: String, ref: "User" },
    to: { type: String, ref: "Tweet" }
});

// 複数カラムをユニークに設定
Favorite.index({ created_at: 1, from: 1, to: 1 }, { unique: true })

var Follow = new Schema({
    created_at: { type: Date, require: true },
    observed_at: { type: Date, default: Date.now },
    max_position: { type: String },
    min_position: { type: String },
    target_users: { type: [String], ref: 'User' },
    targets_sige: Number,
    sources: { type: [String], ref: 'User' },
    sources_size: Number,
    from: { type: String, ref: "User" },
    to: { type: String, ref: "User" }
});

// 複数カラムをユニークにする。
Follow.index({ created_at: 1, from: 1, to: 1 }, { unique: true })

exports.Tweet = mongoose.model("Tweet", Tweet);
exports.User = mongoose.model("User", User);
exports.Favorite = mongoose.model("Favorite", Favorite);
exports.Follow = mongoose.model("Follow", Follow);
