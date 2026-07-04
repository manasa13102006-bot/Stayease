const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['guest', 'host', 'admin'],
        default: 'guest'
    },
    firstName: {
        type: String,
        required: false, // Not requiring it initially prevents breaking existing accounts
    },
    lastName: {
        type: String,
        required: false,
    },
    contactNumber: {
        type: String,
        required: false,
    },
    bio: {
        type: String,
        required: false,
    }
});

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", userSchema);