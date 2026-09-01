const Joi = require('joi');

const passwordSchema = Joi.string()
  .min(8)
  .max(50)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
  });

const emailSchema = Joi.string()
  .email()
  .required()
  .trim()
  .lowercase();

const phoneSchema = Joi.string()
  .pattern(/^[0-9]{10}$/)
  .messages({
    'string.pattern.base': 'Phone number must be 10 digits'
  });

const userSchemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required().trim(),
    email: emailSchema,
    password: passwordSchema,
    organization: Joi.string().min(2).max(100).required().trim(),
    role: Joi.string().valid('student', 'college-admin').default('student'),
    phone: phoneSchema.optional()
  }),

  login: Joi.object({
    email: emailSchema,
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50).optional().trim(),
    phone: phoneSchema.optional(),
    organization: Joi.string().min(2).max(100).optional().trim()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: passwordSchema
  })
};

const authSchemas = {
  login: Joi.object({
    email: emailSchema,
    password: Joi.string().required()
  }),

  sendLoginOtp: Joi.object({
    email: emailSchema
  }),

  verifyLoginOtp: Joi.object({
    email: emailSchema,
    otp: Joi.string().required()
  }),

  sendSignupOtpStudent: Joi.object({
    name: Joi.string().min(2).max(50).required().trim(),
    email: emailSchema,
    organization: Joi.string().min(2).max(100).required().trim(),
    password: passwordSchema
  }),

  verifySignupOtpStudent: Joi.object({
    email: emailSchema,
    otp: Joi.string().required()
  }),

  sendSignupOtpCollegeAdmin: Joi.object({
    name: Joi.string().min(2).max(50).required().trim(),
    email: emailSchema,
    organization: Joi.string().min(2).max(100).required().trim(),
    password: passwordSchema
  }),

  verifySignupOtpCollegeAdmin: Joi.object({
    email: emailSchema,
    otp: Joi.string().required()
  })
};

const studentProfileSchemas = {
  createProfile: Joi.object({
    branch: Joi.string().required().trim(),
    graduationYear: Joi.number().min(2024).max(2030).required(),
    cgpa: Joi.number().min(0).max(10).optional(),
    linkedinProfile: Joi.string().uri().optional(),
    portfolioLink: Joi.string().uri().optional()
  }),

  addCodingPlatform: Joi.object({
    platform: Joi.string().valid('leetcode', 'github', 'hackerrank', 'codechef', 'gfg', 'codeforces').required(),
    username: Joi.string().min(1).max(100).required().trim()
  })
};

const codingProfileSchemas = {
  initiateVerification: Joi.object({
    platform: Joi.string().valid('leetcode', 'github', 'hackerrank', 'codeforces', 'codechef', 'gfg').required(),
    username: Joi.string().min(1).max(100).required().trim()
  }),

  verifyProfile: Joi.object({
    platform: Joi.string().valid('leetcode', 'github', 'hackerrank', 'codeforces', 'codechef', 'gfg').required()
  }),

  syncProfile: Joi.object({
    platform: Joi.string().valid('leetcode', 'github', 'hackerrank', 'codeforces', 'codechef', 'gfg').required()
  })
};

const interviewSchemas = {
  createSession: Joi.object({
    jobDescription: Joi.any().custom((value, helpers) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;

        const innerSchema = Joi.object({
          title: Joi.string().required(),
          description: Joi.string().required(),
          requiredSkills: Joi.array().items(Joi.string()).optional(),
          techStack: Joi.array().items(Joi.string()).optional()
        });

        const { error, value: validatedValue } = innerSchema.validate(parsed);
        if (error) return helpers.error('object.base');

        return validatedValue;
      } catch (e) {
        return helpers.error('object.base');
      }
    }).required(),

    targetRole: Joi.string().required(),
    preferredCodingLanguage: Joi.string().required(),
    campaignId: Joi.string().hex().length(24).optional(),

    selectedRounds: Joi.any().custom((value, helpers) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;

        const innerSchema = Joi.array()
          .items(Joi.string().valid('aptitude', 'coding', 'technical', 'hr'))
          .min(1);

        const { error, value: validatedValue } = innerSchema.validate(parsed);
        if (error) return helpers.error('array.base');

        return validatedValue;
      } catch (e) {
        return helpers.error('array.base');
      }
    }).required()
  }),

  sessionIdParam: Joi.object({
    sessionId: Joi.string().required()
  }),

  initializeAptitudeBatch: Joi.object({
    topics: Joi.alternatives().try(
      Joi.array().items(Joi.string()),
      Joi.string()
    ).optional()
  }),

  getAptitudeQuestion: Joi.object({
    batchSessionId: Joi.string().required()
  }),

  submitResponse: Joi.object({
    sessionId: Joi.string().required(),
    roundType: Joi.string().required(),
    responses: Joi.alternatives().try(
      Joi.array().items(Joi.object()).min(1),
      Joi.string()
    ).required(),
    timeSpent: Joi.number().min(0).optional()
  }),

  submitAptitude: Joi.object({
    questionId: Joi.string().required(),
    studentAnswer: Joi.alternatives().try(
      Joi.string(),
      Joi.number()
    ).required()
  }),

  submitCoding: Joi.object({
    questionId: Joi.string().required(),
    code: Joi.string().required(),
    language: Joi.string().required()
  }),

  submitTechnical: Joi.object({
    questionId: Joi.string().required(),
    code: Joi.string().required(),
    language: Joi.string().required()
  })
};

const resumeSchemas = {
  uploadResume: Joi.object({
    fileName: Joi.string().required(),
    fileSize: Joi.number().max(5242880).required(),
    mimeType: Joi.string().valid(
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ).required()
  }),

  resumeIdParam: Joi.object({
    id: Joi.string().hex().length(24).required()
  }),

  saveResume: Joi.object({
    resumeId: Joi.string().hex().length(24).optional(),
    title: Joi.string().max(200).optional().trim(),
    templateId: Joi.string().max(50).optional(),
    targetRole: Joi.string().max(200).optional().trim(),
    experienceLevel: Joi.string().valid('Fresher', 'Intermediate', 'Experienced').optional(),
    targetJD: Joi.string().max(10000).allow('').optional(),
    personalInfo: Joi.object({
      fullName: Joi.string().max(200).allow('').optional(),
      email: Joi.string().email().allow('').optional(),
      phone: Joi.string().max(20).allow('').optional(),
      linkedin: Joi.string().uri().allow('').optional(),
      github: Joi.string().uri().allow('').optional(),
      summary: Joi.string().max(2000).allow('').optional()
    }).optional(),
    education: Joi.array().items(Joi.object({
      institution: Joi.string().max(200).allow('').optional(),
      degree: Joi.string().max(200).allow('').optional(),
      startDate: Joi.string().max(50).allow('').optional(),
      endDate: Joi.string().max(50).allow('').optional(),
      grade: Joi.string().max(50).allow('').optional()
    })).optional(),
    experience: Joi.array().items(Joi.object({
      company: Joi.string().max(200).allow('').optional(),
      position: Joi.string().max(200).allow('').optional(),
      startDate: Joi.string().max(50).allow('').optional(),
      endDate: Joi.string().max(50).allow('').optional(),
      description: Joi.string().max(5000).allow('').optional()
    })).optional(),
    skills: Joi.array().items(Joi.string().max(100).trim()).optional(),
    projects: Joi.array().items(Joi.object({
      title: Joi.string().max(200).allow('').optional(),
      description: Joi.string().max(3000).allow('').optional(),
      technologies: Joi.array().items(Joi.string().max(100).trim()).optional(),
      githubUrl: Joi.string().uri().allow('').optional(),
      liveUrl: Joi.string().uri().allow('').optional()
    })).optional(),
    certificates: Joi.array().items(Joi.object({
      name: Joi.string().max(200).allow('').optional(),
      issuer: Joi.string().max(200).allow('').optional(),
      issueDate: Joi.string().max(50).allow('').optional(),
      expiryDate: Joi.string().max(50).allow('').optional(),
      credentialId: Joi.string().max(200).allow('').optional(),
      url: Joi.string().uri().allow('').optional()
    })).optional()
  }),

  analyzeResume: Joi.object({
    targetRole: Joi.string().max(200).required(),
    experienceLevel: Joi.string().valid('Fresher', 'Intermediate', 'Experienced').required(),
    targetJD: Joi.string().max(10000).allow('').optional()
  }),

  optimizeResume: Joi.object({
    targetRole: Joi.string().max(200).required(),
    experienceLevel: Joi.string().valid('Fresher', 'Intermediate', 'Experienced').required(),
    targetJD: Joi.string().max(10000).allow('').optional(),
    personalInfo: Joi.object({
      fullName: Joi.string().max(200).allow('').optional(),
      email: Joi.string().email().allow('').optional(),
      summary: Joi.string().max(2000).allow('').optional()
    }).optional(),
    skills: Joi.array().items(Joi.string().max(100).trim()).optional(),
    experience: Joi.array().items(Joi.object({
      company: Joi.string().allow('').optional(),
      position: Joi.string().allow('').optional(),
      description: Joi.string().max(5000).allow('').optional()
    })).optional(),
    projects: Joi.array().items(Joi.object({
      title: Joi.string().allow('').optional(),
      description: Joi.string().max(3000).allow('').optional(),
      technologies: Joi.array().items(Joi.string().max(100).trim()).optional(),
      githubUrl: Joi.string().uri().allow('').optional(),
      liveUrl: Joi.string().uri().allow('').optional()
    })).optional(),
    certificates: Joi.array().items(Joi.object({
      name: Joi.string().allow('').optional(),
      issuer: Joi.string().allow('').optional(),
      url: Joi.string().uri().allow('').optional()
    })).optional()
  })
};

const subscriptionSchemas = {
  createSubscription: Joi.object({
    planId: Joi.string().valid('basic', 'pro', 'enterprise').required(),
    seats: Joi.number().min(1).max(5000).required(),
    billingCycle: Joi.string().valid('monthly', 'quarterly', 'yearly').required(),
    autoRenew: Joi.boolean().default(true)
  }),

  studentCreateSubscription: Joi.object({
    planId: Joi.string().valid('student_basic', 'student_pro', 'student_premium').required(),
    billingCycle: Joi.string().valid('monthly', 'quarterly', 'yearly').default('monthly'),
    autoRenew: Joi.boolean().default(true)
  }),

  updateSubscription: Joi.object({
    seats: Joi.number().min(1).max(5000).optional(),
    autoRenew: Joi.boolean().optional(),
    planId: Joi.string().optional()
  }),

  upgradeSubscription: Joi.object({
    subscriptionId: Joi.string().required(),
    newPlanId: Joi.string().valid('basic', 'pro', 'enterprise').required(),
    newSeats: Joi.number().min(1).max(5000).optional()
  }),

  downgradeSubscription: Joi.object({
    subscriptionId: Joi.string().required(),
    newPlanId: Joi.string().valid('basic', 'pro', 'enterprise').required(),
    newSeats: Joi.number().min(1).max(5000).optional()
  }),

  cancelSubscription: Joi.object({
    subscriptionId: Joi.string().required(),
    reason: Joi.string().max(500).optional()
  }),

  renewSubscription: Joi.object({
    subscriptionId: Joi.string().required()
  })
};

const paymentSchemas = {
  initiatePayment: Joi.object({
    subscriptionId: Joi.string().optional(),
    billingId: Joi.string().optional(),
    amount: Joi.number().min(1).optional(),
    currency: Joi.string().valid('INR', 'USD', 'EUR').default('INR'),
    paymentMethod: Joi.string().valid('credit_card', 'debit_card', 'upi', 'net_banking', 'bank_transfer', 'wallet').optional(),
    customerEmail: Joi.string().email().required(),
    customerPhone: Joi.string().required()
  }).custom((value, helpers) => {
    if (!value.subscriptionId && !value.billingId) {
      return helpers.error('any.custom', { message: 'Either subscriptionId or billingId is required' });
    }
    return value;
  }),

  verifyPayment: Joi.object({
    orderId: Joi.string().required(),
    paymentId: Joi.string().required(),
    signature: Joi.string().required()
  }),

  retryPayment: Joi.object({
    paymentLogId: Joi.string().optional(),
    billingId: Joi.string().optional()
  }).custom((value, helpers) => {
    if (!value.paymentLogId && !value.billingId) {
      return helpers.error('any.custom', { message: 'Either paymentLogId or billingId is required' });
    }
    return value;
  }),

  refundPayment: Joi.object({
    paymentId: Joi.string().required(),
    amount: Joi.number().min(0).optional(),
    reason: Joi.string().max(500).required()
  })
};

const billingSchemas = {
  getInvoices: Joi.object({
    organizationId: Joi.string().optional(),
    status: Joi.string().valid('pending', 'completed', 'failed', 'refunded').optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10)
  }),

  getInvoiceById: Joi.object({
    invoiceId: Joi.string().required()
  }),

  downloadInvoice: Joi.object({
    invoiceId: Joi.string().required()
  }),

  createInvoice: Joi.object({
    subscriptionId: Joi.string().required(),
    subtotal: Joi.number().min(0).required(),
    tax: Joi.number().min(0).optional(),
    discount: Joi.number().min(0).optional()
  }),

  sendReminder: Joi.object({
    billingId: Joi.string().required()
  }),

  getStats: Joi.object({
    organizationId: Joi.string().optional()
  })
};

const reportSchemas = {
  downloadQuery: Joi.object({
    format: Joi.string().valid('pdf', 'csv').default('pdf'),
    from: Joi.string().isoDate().optional(),
    to: Joi.string().isoDate().optional(),
    granularity: Joi.string().valid('daily', 'weekly', 'monthly').default('monthly'),
    branch: Joi.string().trim().optional(),
    graduationYear: Joi.number().integer().min(1900).max(2100).optional(),
    targetRole: Joi.string().trim().optional()
  }),

  studentIdParam: Joi.object({
    studentId: Joi.string().required()
  }),

  batchIdParam: Joi.object({
    batchId: Joi.string().required()
  }),

  paginationSchema: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    sort: Joi.string().optional(),
    search: Joi.string().optional().trim(),
    userId: Joi.string().optional(),
    userEmail: Joi.string().optional(),
    userRole: Joi.string().optional(),
    action: Joi.string().optional(),
    resourceType: Joi.string().optional(),
    resourceId: Joi.string().optional(),
    status: Joi.string().optional(),
    method: Joi.string().optional(),
    from: Joi.string().isoDate().optional(),
    to: Joi.string().isoDate().optional(),
    hasSensitiveData: Joi.string().valid('true', 'false').optional()
  })
};

const collegeAdminSchemas = {
  createBatch: Joi.object({
    batchName: Joi.string().min(2).max(120).required().trim(),
    batchCode: Joi.string().max(100).optional().allow('', null).trim(),
    academicYear: Joi.string().min(2).max(20).required().trim(),
    graduationYear: Joi.number().min(2000).max(2100).required(),
    department: Joi.string().min(2).max(120).required().trim(),
    section: Joi.string().max(20).optional().allow('', null).trim(),
    description: Joi.string().max(2000).optional().allow('', null),
    placementOfficerNotes: Joi.string().max(2000).optional().allow('', null)
  }),

  updateBatch: Joi.object({
    batchName: Joi.string().min(2).max(120).optional().trim(),
    academicYear: Joi.string().min(2).max(20).optional().trim(),
    graduationYear: Joi.number().min(2000).max(2100).optional(),
    department: Joi.string().min(2).max(120).optional().trim(),
    section: Joi.string().max(20).optional().allow('', null).trim(),
    description: Joi.string().max(2000).optional().allow('', null),
    placementOfficerNotes: Joi.string().max(2000).optional().allow('', null),
    status: Joi.string().valid('active', 'paused', 'archived').optional()
  }),

  batchIdParam: Joi.object({
    batchId: Joi.string().required()
  }),

  addStudentsToBatch: Joi.object({
    studentIds: Joi.alternatives().try(
      Joi.array().items(Joi.string()).min(1),
      Joi.string()
    ).required(),
    notes: Joi.string().max(500).optional().allow('', null)
  }),

  removeStudentsFromBatch: Joi.object({
    studentIds: Joi.alternatives().try(
      Joi.array().items(Joi.string()).min(1),
      Joi.string()
    ).required(),
    notes: Joi.string().max(500).optional().allow('', null)
  }),

  assignCampaignToBatches: Joi.object({
    campaignId: Joi.string().required(),
    batchIds: Joi.alternatives().try(
      Joi.array().items(Joi.string()).min(1),
      Joi.string()
    ).required(),
    notifyStudents: Joi.boolean().default(true)
  }),

  campaignAssignmentParam: Joi.object({
    campaignId: Joi.string().required()
  }),

  upsertOrganizationProfile: Joi.object({
    organizationName: Joi.string().min(2).max(120).optional().trim(),
    organizationType: Joi.string().valid('college', 'university', 'institute', 'training_center').optional(),
    registrationNumber: Joi.string().max(100).optional().allow('', null).trim(),
    address: Joi.object({
      street: Joi.string().optional().allow('', null),
      city: Joi.string().optional().allow('', null),
      state: Joi.string().optional().allow('', null),
      zipCode: Joi.string().optional().allow('', null),
      country: Joi.string().optional().allow('', null)
    }).optional(),
    phone: Joi.string().optional().allow('', null).trim(),
    website: Joi.string().uri().optional().allow('', null),
    primaryContactPerson: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      email: emailSchema,
      phone: Joi.string().optional().allow('', null),
      designation: Joi.string().optional().allow('', null)
    }).optional(),
    secondaryContactPerson: Joi.object().optional(),
    billingContactPerson: Joi.object().optional(),
    totalStudents: Joi.number().min(0).optional(),
    totalFaculty: Joi.number().min(0).optional(),
    establishedYear: Joi.number().min(1800).max(new Date().getFullYear()).optional(),
    accreditation: Joi.string().max(120).optional().allow('', null),
    brandColor: Joi.string().max(20).optional(),
    preferences: Joi.object().optional(),
    taxInformation: Joi.object().optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended', 'pending_verification').optional()
  }),

  addVerificationDocument: Joi.object({
    documentType: Joi.string().valid('registration_certificate', 'udyam_aadhar', 'gst_certificate', 'pan_certificate').optional()
  }),

  allocateSeat: Joi.object({
    studentId: Joi.string().required(),
    notes: Joi.string().max(500).optional().allow('', null)
  }),

  releaseSeat: Joi.object({
    studentId: Joi.string().required(),
    reason: Joi.string().max(500).optional().allow('', null)
  }),

  recalculateScores: Joi.object({
    batchId: Joi.string().optional()
  }),

  createCampaign: Joi.object({
    title: Joi.string().min(2).max(200).required().trim(),
    description: Joi.string().max(2000).optional().allow('', null),
    targetDepartment: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim()),
      Joi.string().trim()
    ).optional(),
    targetBatch: Joi.alternatives().try(
      Joi.array().items(Joi.number()),
      Joi.number()
    ).optional(),
    config: Joi.object({
      hasAptitude: Joi.boolean().optional(),
      hasCoding: Joi.boolean().optional(),
      hasTechnical: Joi.boolean().optional(),
      hasHr: Joi.boolean().optional(),
      hasBehavioral: Joi.boolean().optional(),
      companyTemplate: Joi.string().optional()
    }).optional(),
    assessmentTypes: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('aptitude', 'coding', 'technical', 'hr', 'behavioral', 'company_specific').required(),
        roundName: Joi.string().trim().optional(),
        durationMinutes: Joi.number().min(1).optional(),
        totalQuestions: Joi.number().min(0).optional(),
        passingScore: Joi.number().min(0).max(100).optional(),
        instructions: Joi.string().trim().optional().allow('', null),
        sections: Joi.array().items(
          Joi.object({
            sectionName: Joi.string().trim().required(),
            questionCount: Joi.number().min(0).required(),
            maxScore: Joi.number().min(0).required()
          })
        ).optional()
      })
    ).optional(),
    companyTemplateDetails: Joi.object({
      companyName: Joi.string().trim().optional().allow('', null),
      role: Joi.string().trim().optional().allow('', null),
      eligibility: Joi.string().trim().optional().allow('', null),
      instructions: Joi.string().trim().optional().allow('', null),
      evaluationCriteria: Joi.string().trim().optional().allow('', null),
      testDuration: Joi.number().min(1).optional()
    }).optional(),
    deadline: Joi.date().required(),
    isActive: Joi.boolean().optional(),
    maxStudents: Joi.number().min(1).max(10000).optional()
  }),

  updateCampaign: Joi.object({
    title: Joi.string().min(2).max(200).optional().trim(),
    description: Joi.string().max(2000).optional().allow('', null),
    targetDepartment: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim()),
      Joi.string().trim()
    ).optional(),
    targetBatch: Joi.alternatives().try(
      Joi.array().items(Joi.number()),
      Joi.number()
    ).optional(),
    config: Joi.object({
      hasAptitude: Joi.boolean().optional(),
      hasCoding: Joi.boolean().optional(),
      hasTechnical: Joi.boolean().optional(),
      hasHr: Joi.boolean().optional(),
      hasBehavioral: Joi.boolean().optional(),
      companyTemplate: Joi.string().optional()
    }).optional(),
    assessmentTypes: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('aptitude', 'coding', 'technical', 'hr', 'behavioral', 'company_specific').required(),
        roundName: Joi.string().trim().optional(),
        durationMinutes: Joi.number().min(1).optional(),
        totalQuestions: Joi.number().min(0).optional(),
        passingScore: Joi.number().min(0).max(100).optional(),
        instructions: Joi.string().trim().optional().allow('', null),
        sections: Joi.array().items(
          Joi.object({
            sectionName: Joi.string().trim().required(),
            questionCount: Joi.number().min(0).required(),
            maxScore: Joi.number().min(0).required()
          })
        ).optional()
      })
    ).optional(),
    companyTemplateDetails: Joi.object({
      companyName: Joi.string().trim().optional().allow('', null),
      role: Joi.string().trim().optional().allow('', null),
      eligibility: Joi.string().trim().optional().allow('', null),
      instructions: Joi.string().trim().optional().allow('', null),
      evaluationCriteria: Joi.string().trim().optional().allow('', null),
      testDuration: Joi.number().min(1).optional()
    }).optional(),
    deadline: Joi.date().optional(),
    isActive: Joi.boolean().optional(),
    maxStudents: Joi.number().min(1).max(10000).optional()
  }),

  studentIdParam: Joi.object({
    studentId: Joi.string().required()
  }),

  campaignIdParam: Joi.object({
    campaignId: Joi.string().required()
  })
};

const superAdminSchemas = {
  auditLogIdParam: Joi.object({
    auditLogId: Joi.string().required()
  }),

  approveCollegeAdmin: Joi.object({
    id: Joi.string().hex().length(24).required()
  }),

  rejectCollegeAdmin: Joi.object({
    id: Joi.string().hex().length(24).required()
  }),

  organizationQuery: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'suspended', 'pending_verification').optional(),
    isVerified: Joi.boolean().optional(),
    search: Joi.string().optional().trim(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10)
  }),

  organizationIdParam: Joi.object({
    organizationId: Joi.string().required()
  }),

  updateOrganizationStatus: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'suspended', 'pending_verification').optional(),
    isVerified: Joi.boolean().optional()
  })
};

const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  sort: Joi.string().optional(),
  search: Joi.string().optional().trim()
});

const notificationSchemas = {
  updatePreferences: Joi.object({
    globalChannels: Joi.object({
      inApp: Joi.boolean().optional(),
      email: Joi.boolean().optional()
    }).optional(),
    eventPreferences: Joi.object().pattern(
      Joi.string().valid(
        'interview_scheduled', 'interview_completed', 'result_available',
        'subscription_expiring', 'subscription_expired', 'payment_due',
        'payment_reminder', 'seat_allocated', 'seat_released',
        'profile_update', 'system_alert', 'achievement_unlocked',
        'campaign_opened', 'offer_available', 'deadline_approaching',
        'account_approved', 'account_rejected', 'account_signup'
      ),
      Joi.object({
        inApp: Joi.boolean().optional(),
        email: Joi.boolean().optional()
      })
    ).optional()
  })
};

const passwordResetSchemas = {
  forgotPassword: Joi.object({
    email: emailSchema
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: passwordSchema
  }),

  verifyToken: Joi.object({
    token: Joi.string().required()
  })
};

const analyticsSchemas = {
  analyticsQuery: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    days: Joi.number().min(1).max(365).default(30),
    from: Joi.string().isoDate().optional(),
    to: Joi.string().isoDate().optional(),
    granularity: Joi.string().valid('daily', 'weekly', 'monthly').default('monthly')
  }),

  activityTimelineQuery: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(50),
    action: Joi.string().optional(),
    resourceType: Joi.string().optional(),
    from: Joi.string().isoDate().optional(),
    to: Joi.string().isoDate().optional(),
    userRole: Joi.string().valid('student', 'college-admin', 'super-admin').optional(),
    userId: Joi.string().optional(),
    organizationId: Joi.string().optional()
  }),

  sessionAnalyticsQuery: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  }),

  riskDashboardQuery: Joi.object({
    days: Joi.number().min(1).max(365).default(30),
    riskLevel: Joi.string().valid('low', 'medium', 'high', 'critical').optional()
  })
};

const collegeInsightsSchemas = {
  missedAptitude: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    batchId: Joi.string().optional(),
    graduationYear: Joi.number().integer().min(2000).max(2100).optional()
  }),

  topCandidates: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(50),
    minReadinessScore: Joi.number().min(0).max(100).default(60),
    graduationYear: Joi.number().integer().min(2000).max(2100).optional(),
    batchId: Joi.string().optional()
  }),

  compareBatches: Joi.object({
    graduationYears: Joi.alternatives().try(
      Joi.array().items(Joi.number().integer()),
      Joi.string()
    ).optional(),
    batchIds: Joi.alternatives().try(
      Joi.array().items(Joi.string()),
      Joi.string()
    ).optional()
  }),

  universityInsights: Joi.object({
    days: Joi.number().integer().min(7).max(365).default(90)
  }),

  batchReadinessQuery: Joi.object({
    batchId: Joi.string().required()
  }),

  decliningStudentsQuery: Joi.object({
    batchId: Joi.string().optional(),
    graduationYear: Joi.number().integer().min(2000).max(2100).optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(50)
  }),

  aiComparativeReport: Joi.object({
    batchIds: Joi.alternatives().try(
      Joi.array().items(Joi.string()),
      Joi.string()
    ).optional(),
    graduationYears: Joi.alternatives().try(
      Joi.array().items(Joi.number().integer()),
      Joi.string()
    ).optional(),
    includeStudentProfiles: Joi.boolean().default(false)
  }),

  insightIdParam: Joi.object({
    insightId: Joi.string().required()
  })
};

const recommendationSchemas = {
  createRecommendation: Joi.object({
    recommendationType: Joi.string().valid('workshop', 'bootcamp', 'training-program', 'certification').required(),
    title: Joi.string().min(2).max(200).required().trim(),
    description: Joi.string().max(2000).required().trim(),
    targetAudience: Joi.object({
      departments: Joi.array().items(Joi.string().trim()).optional(),
      graduationYears: Joi.array().items(Joi.number().integer()).optional(),
      minReadinessScore: Joi.number().min(0).max(100).optional(),
      maxRiskScore: Joi.number().min(0).max(100).optional()
    }).optional(),
    priority: Joi.string().valid('high', 'medium', 'low').default('medium'),
    estimatedImpact: Joi.string().valid('high', 'medium', 'low').default('medium'),
    reason: Joi.string().max(1000).optional().allow('', null),
    skillGaps: Joi.array().items(Joi.object({
      skill: Joi.string().trim().required(),
      studentCount: Joi.number().min(0).optional()
    })).optional(),
    affectedStudentCount: Joi.number().min(0).optional(),
    expiresAt: Joi.date().optional(),
    externalUrl: Joi.string().uri().optional().allow('', null),
    externalPlatform: Joi.string().valid('internal', 'udemy', 'coursera', 'linkedin_learning', 'youtube', 'custom', 'other').default('internal'),
    tags: Joi.array().items(Joi.string().trim()).optional()
  }),

  updateRecommendation: Joi.object({
    recommendationType: Joi.string().valid('workshop', 'bootcamp', 'training-program', 'certification').optional(),
    title: Joi.string().min(2).max(200).optional().trim(),
    description: Joi.string().max(2000).optional().trim(),
    targetAudience: Joi.object({
      departments: Joi.array().items(Joi.string().trim()).optional(),
      graduationYears: Joi.array().items(Joi.number().integer()).optional(),
      minReadinessScore: Joi.number().min(0).max(100).optional(),
      maxRiskScore: Joi.number().min(0).max(100).optional()
    }).optional(),
    priority: Joi.string().valid('high', 'medium', 'low').optional(),
    estimatedImpact: Joi.string().valid('high', 'medium', 'low').optional(),
    reason: Joi.string().max(1000).optional().allow('', null),
    skillGaps: Joi.array().items(Joi.object({
      skill: Joi.string().trim().required(),
      studentCount: Joi.number().min(0).optional()
    })).optional(),
    affectedStudentCount: Joi.number().min(0).optional(),
    isActive: Joi.boolean().optional(),
    expiresAt: Joi.date().optional(),
    externalUrl: Joi.string().uri().optional().allow('', null),
    externalPlatform: Joi.string().valid('internal', 'udemy', 'coursera', 'linkedin_learning', 'youtube', 'custom', 'other').optional(),
    tags: Joi.array().items(Joi.string().trim()).optional()
  }),

  recommendationIdParam: Joi.object({
    recommendationId: Joi.string().required()
  }),

  assignRecommendationToBatch: Joi.object({
    batchId: Joi.string().required(),
    deadline: Joi.date().optional(),
    notifyStudents: Joi.boolean().default(true)
  }),

  assignRecommendationToStudent: Joi.object({
    studentId: Joi.string().required(),
    deadline: Joi.date().optional(),
    notifyStudent: Joi.boolean().default(true)
  }),

  createFollowUp: Joi.object({
    targetType: Joi.string().valid('campaign', 'student', 'batch').required(),
    campaignId: Joi.string().optional(),
    studentId: Joi.string().optional(),
    batchId: Joi.string().optional(),
    followUpType: Joi.string().valid('assessment_assigned', 'deadline_reminder', 'performance_alert', 'placement_drive', 'follow_up_pending', 'recommendation_assigned').required(),
    scheduleDate: Joi.date().required(),
    title: Joi.string().min(2).max(200).required().trim(),
    message: Joi.string().max(1000).required().trim(),
    description: Joi.string().max(2000).optional().allow('', null),
    actionUrl: Joi.string().uri().optional().allow('', null),
    actionText: Joi.string().max(100).optional().allow('', null),
    channels: Joi.object({
      inApp: Joi.boolean().default(true),
      email: Joi.boolean().default(true)
    }).optional(),
    recipientRole: Joi.string().valid('student', 'college-admin', 'super-admin').default('student')
  }),

  followUpIdParam: Joi.object({
    followUpId: Joi.string().required()
  }),

  batchReadinessQuery: Joi.object({
    batchId: Joi.string().required()
  }),

  decliningStudentsQuery: Joi.object({
    batchId: Joi.string().optional(),
    graduationYear: Joi.number().integer().min(2000).max(2100).optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(50)
  }),

  scoreHistoryQuery: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    trend: Joi.string().valid('improving', 'declining', 'stable').optional()
  }),

  updateStudentIntelligence: Joi.object({
    techScore: Joi.number().min(0).max(100).optional(),
    aptitudeScore: Joi.number().min(0).max(100).optional(),
    codingScore: Joi.number().min(0).max(100).optional(),
    communicationScore: Joi.number().min(0).max(100).optional(),
    atsScore: Joi.number().min(0).max(100).optional(),
    skillGaps: Joi.array().items(Joi.string().trim()).optional(),
    proficiencyLevels: Joi.object().optional(),
    linkedinProfile: Joi.string().uri().optional().allow('', null),
    githubProfile: Joi.string().uri().optional().allow('', null),
    kaggleProfile: Joi.string().uri().optional().allow('', null)
  }),

  assignCampaignToStudents: Joi.object({
    campaignId: Joi.string().required(),
    studentIds: Joi.alternatives().try(
      Joi.array().items(Joi.string()).min(1),
      Joi.string()
    ).required(),
    notifyStudents: Joi.boolean().default(true)
  }),

  bulkNotificationQuery: Joi.object({
    targetType: Joi.string().valid('students', 'batch').required(),
    batchId: Joi.string().optional(),
    title: Joi.string().min(2).max(200).required().trim(),
    message: Joi.string().max(1000).required().trim(),
    description: Joi.string().max(2000).optional().allow('', null),
    actionUrl: Joi.string().uri().optional().allow('', null),
    actionText: Joi.string().max(100).optional().allow('', null),
    sendEmail: Joi.boolean().default(false),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal')
  })
};

const insightsSchemas = {
  generatePlan: Joi.object({
    sourceSessionId: Joi.string().optional().allow(null, ''),
    targetRole: Joi.string().max(200).optional().trim().allow(null, ''),
    jobDescription: Joi.string().max(5000).optional().trim().allow(null, '')
  }),

  planIdParam: Joi.object({
    planId: Joi.string().required()
  }),

  historicalReportQuery: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    roundType: Joi.string().valid('aptitude', 'coding', 'technical', 'hr', 'behavioral').optional(),
    status: Joi.string().valid('completed', 'failed', 'initialized', 'ongoing').optional(),
    from: Joi.string().isoDate().optional(),
    to: Joi.string().isoDate().optional(),
    minScore: Joi.number().min(0).max(100).optional(),
    maxScore: Joi.number().min(0).max(100).optional()
  }),

  updatePlanStatus: Joi.object({
    status: Joi.string().valid('active', 'paused', 'completed', 'archived').required()
  })
};

module.exports = {
  userSchemas,
  authSchemas,
  studentProfileSchemas,
  codingProfileSchemas,
  interviewSchemas,
  resumeSchemas,
  subscriptionSchemas,
  paymentSchemas,
  billingSchemas,
  collegeAdminSchemas,
  reportSchemas,
  paginationSchema,
  passwordSchema,
  emailSchema,
  phoneSchema,
  notificationSchemas,
  analyticsSchemas,
  collegeInsightsSchemas,
  recommendationSchemas,
  insightsSchemas,
  passwordResetSchemas,
  superAdminSchemas
};
