const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const userSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        select: false
    },
    role: {
        type: String,
        enum: ['student', 'college-admin', 'super-admin'],
        default: 'student',
        required: true
    },
    organization: {
        type: String,
        required: [true, 'Organization/College name is required'],
        trim: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    refreshToken: {
        type: String,
        select: false
    },
    collegeDomain: {
        type: String,
        trim: true,
        default: null
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Approved' // for students
    },
    approvedAt: {
        type: Date
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },

    linkedinId: {
        type: String,
        unique: true,
        sparse: true
    },

    githubId: {
        type: String,
        unique: true,
        sparse: true
    },

    codingProfiles: {
        type: Schema.Types.Mixed,
        default: {}
    },

    // Free trial allowance granted to every student at signup. Once a bucket's
    // `used` reaches `total`, that feature falls back to "limited" until the
    // student either buys their own subscription or gets a seat from a college.
    trials: {
        isActive: { type: Boolean, default: true },
        mockInterviews: {
            total: { type: Number, default: 3 },
            used: { type: Number, default: 0 }
        },
        studentReports: {
            total: { type: Number, default: 1 },
            used: { type: Number, default: 0 }
        },
        aiEvaluation: {
            total: { type: Number, default: 2 },
            used: { type: Number, default: 0 }
        }
    }

}, { timestamps: true });


userSchema.index({ role: 1 });
userSchema.index({ status: 1 });


// Mongoose Pre-save Hook: Agar naya user 'college-admin' hai, toh uska status automatic 'Pending' ho jaye
userSchema.pre('save', function () {
    if (this.isNew && this.role === 'college-admin') {
        this.status = 'Pending';
    }

});


const User = mongoose.model("User", userSchema);

module.exports = User;