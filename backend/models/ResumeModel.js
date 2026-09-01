const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ResumeSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'Untitled Resume'
    },
    templateId: {
        type: String,
        default: 'template_1'
    },
    targetRole: { type: String, default: '' },
    experienceLevel: { type: String, enum: ['Fresher', 'Intermediate', 'Experienced'], default: 'Fresher' },
    targetJD: { type: String, default: '' },

    personalInfo: {
        fullName: { type: String, default: '' },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        github: { type: String, default: '' },
        summary: { type: String, default: '' }
    },
    education: [{
        institution: String,
        degree: String,
        startDate: String,
        endDate: String,
        grade: String
    }],
    experience: [{
        company: String,
        position: String,
        startDate: String,
        endDate: String,
        description: { type: String, default: '' } // Paragraph or split bullets
    }],
    skills: [{ type: String, trim: true }],
    projects: [{
        title: String,
        description: String,
        technologies: [String],
        githubUrl: { type: String, default: '' },
        liveUrl: { type: String, default: '' }
    }],
    certificates: [{
        name: { type: String, default: '' },
        issuer: { type: String, default: '' },
        issueDate: { type: String, default: '' },
        expiryDate: { type: String, default: '' },
        credentialId: { type: String, default: '' },
        url: { type: String, default: '' }
    }]
}, { timestamps: true });

const Resume = mongoose.model('Resume', ResumeSchema);


module.exports = Resume;
