const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const otpSchema = new Schema({
    email: {
        type: String,
        required: true,
        index: true
    },

    otp: {
        type: String,
        required: true
    },

    type: {
        type: String,
        enum: ["Signup", "login", "password_reset"],
        required: true
    },

    payload: {
        type: Object,
        default: {}
    },

    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });


otpSchema.index(
    {
        expiresAt: 1,
    },

    {
        expireAfterSeconds: 0,
    }
);


const Otp = mongoose.model("Otp", otpSchema);

module.exports = Otp;