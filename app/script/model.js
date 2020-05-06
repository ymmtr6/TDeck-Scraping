var mongoose = require("mongoose")
var Schema = mongoose.Schema;

var Tweet = new Schema({
    id: { type: Number, require: true, unique: true },
    id_str: String,
    created_at: { type: Date, default: Date.now },
    full_text: String,
    url: String,
    source: String,
    uid: {
        type: Number,
        ref: 'User'
    },
    in_reply_to_status_id: Number,
    in_reply_to_user_id: Number,
    in_reply_to_screen_name: Number,
    retweeted: Boolean,
    is_quote_status: Boolean,
    retweet_count: Number,
    favorite_count: Number,

});

var User = new Schema({
    uid: { type: Number, require: true, unique: true },
    uid_str: String,
    name: String,
    screen_name: String,
    location: String,
    description: String,
    url: String,
    followers_count: Number,
    created_at: { type: Date, default: Date.now },
    friends_count: Number,
    profile_image_url: String
});

exports.Tweet = mongoose.model("Tweet", Tweet);
exports.User = mongoose.model("User", User);
