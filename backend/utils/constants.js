// System Constants and Enums

// =============================================================================
// USER & ROLES
// =============================================================================

const USER_ROLES = {
    STUDENT: 'student',
    COLLEGE_ADMIN: 'college-admin',
    SUPER_ADMIN: 'super-admin'
};

const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    DELETED: 'deleted',
    PENDING_VERIFICATION: 'pending_verification'
};

// =============================================================================
// SUBSCRIPTION & BILLING
// =============================================================================

const SUBSCRIPTION_PLANS = {
    BASIC: {
        name: 'Basic',
        monthlyPrice: 5000,
        yearlyPrice: 50000,
        seats: 50,
        features: {
            mockInterviews: true,
            proctoring: false,
            aiEvaluation: false,
            placementIntelligence: false,
            studentReports: true,
            batchManagement: false,
            advancedAnalytics: false,
            apiAccess: false,
            customBranding: false
        },
        limits: {
            mockInterviewsPerMonth: 100,
            studentReportsPerMonth: 50,
            apiCallsPerDay: 0,
            storageGB: 10
        }
    },

    PRO: {
        name: 'Pro',
        monthlyPrice: 15000,
        yearlyPrice: 150000,
        seats: 500,
        features: {
            mockInterviews: true,
            proctoring: true,
            aiEvaluation: true,
            placementIntelligence: false,
            studentReports: true,
            batchManagement: true,
            advancedAnalytics: true,
            apiAccess: true,
            customBranding: false
        },
        limits: {
            mockInterviewsPerMonth: 1000,
            studentReportsPerMonth: 500,
            apiCallsPerDay: 1000,
            storageGB: 100
        }
    },

    ENTERPRISE: {
        name: 'Enterprise',
        monthlyPrice: 50000,
        yearlyPrice: 500000,
        seats: 5000,
        features: {
            mockInterviews: true,
            proctoring: true,
            aiEvaluation: true,
            placementIntelligence: true,
            studentReports: true,
            batchManagement: true,
            advancedAnalytics: true,
            apiAccess: true,
            customBranding: true
        },
        limits: {
            mockInterviewsPerMonth: -1,
            studentReportsPerMonth: -1,
            apiCallsPerDay: -1,
            storageGB: 1000
        }
    }
};

// Individual (self-serve) student plans. These are single-user plans priced for
// one student practicing on their own — NOT seat-based like the college plans
// above. They intentionally exclude org-only features (batchManagement,
// apiAccess, customBranding).
const STUDENT_PLANS = {
    STUDENT_BASIC: {
        name: 'Student Basic',
        monthlyPrice: 499,
        yearlyPrice: 4990,
        seats: 1,
        features: {
            mockInterviews: true,
            proctoring: false,
            aiEvaluation: true,
            placementIntelligence: false,
            studentReports: true,
            batchManagement: false,
            advancedAnalytics: false,
            apiAccess: false,
            customBranding: false
        },
        limits: {
            mockInterviewsPerMonth: 15,
            studentReportsPerMonth: 3,
            apiCallsPerDay: 100,
            storageGB: 2
        }
    },

    STUDENT_PRO: {
        name: 'Student Pro',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        seats: 1,
        features: {
            mockInterviews: true,
            proctoring: true,
            aiEvaluation: true,
            placementIntelligence: true,
            studentReports: true,
            batchManagement: false,
            advancedAnalytics: true,
            apiAccess: false,
            customBranding: false
        },
        limits: {
            mockInterviewsPerMonth: 50,
            studentReportsPerMonth: 10,
            apiCallsPerDay: 500,
            storageGB: 10
        }
    },

    STUDENT_PREMIUM: {
        name: 'Student Premium',
        monthlyPrice: 1999,
        yearlyPrice: 19990,
        seats: 1,
        features: {
            mockInterviews: true,
            proctoring: true,
            aiEvaluation: true,
            placementIntelligence: true,
            studentReports: true,
            batchManagement: false,
            advancedAnalytics: true,
            apiAccess: false,
            customBranding: false
        },
        limits: {
            mockInterviewsPerMonth: -1,
            studentReportsPerMonth: -1,
            apiCallsPerDay: -1,
            storageGB: 50
        }
    }
};

// Resolve a plan from the correct registry based on who owns the subscription.
const PLAN_REGISTRIES = {
    organization: SUBSCRIPTION_PLANS,
    individual: STUDENT_PLANS
};

function getPlan(planId, ownerType = 'organization') {
    if (!planId) return null;
    const registry = PLAN_REGISTRIES[ownerType] || SUBSCRIPTION_PLANS;
    return registry[planId.toUpperCase()] || null;
}

const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    GRACE_PERIOD: 'grace_period',
    SUSPENDED: 'suspended',
    CANCELLED: 'cancelled'
};

const BILLING_CYCLE = {
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    YEARLY: 'yearly'
};

const PAYMENT_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
};

const PAYMENT_METHODS = {
    CREDIT_CARD: 'credit_card',
    DEBIT_CARD: 'debit_card',
    BANK_TRANSFER: 'bank_transfer',
    UPI: 'upi',
    NET_BANKING: 'net_banking'
};

// Tax rate applied to invoices (e.g. 0.18 for 18% GST). Set via env
// TAX_RATE to enable; defaults to 0 so behaviour is unchanged until configured.
const TAX_RATE = parseFloat(process.env.TAX_RATE || '0');

// =============================================================================
// ORGANIZATION
// =============================================================================

const ORGANIZATION_TYPES = {
    COLLEGE: 'college',
    UNIVERSITY: 'university',
    INSTITUTE: 'institute',
    TRAINING_CENTER: 'training_center'
};

const ORGANIZATION_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING_VERIFICATION: 'pending_verification'
};

const VERIFICATION_DOCUMENT_TYPES = {
    REGISTRATION_CERTIFICATE: 'registration_certificate',
    UDYAM_AADHAR: 'udyam_aadhar',
    GST_CERTIFICATE: 'gst_certificate',
    PAN_CERTIFICATE: 'pan_certificate'
};

const TAX_FILING_STATUS = {
    NOT_REGISTERED: 'not_registered',
    REGISTERED: 'registered',
    EXEMPT: 'exempt'
};

// =============================================================================
// INTERVIEW & ROUNDS
// =============================================================================

const INTERVIEW_ROUNDS = {
    APTITUDE: 'aptitude',
    CODING: 'coding',
    TECHNICAL: 'technical',
    HR: 'hr',
};

const DIFFICULTY_LEVELS = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
};

const INTERVIEW_STATUS = {
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in_progress',
    SUBMITTED: 'submitted',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired'
};

const INTERVIEW_TYPE = {
    MOCK: 'mock',
    PRACTICE: 'practice',
    ACTUAL: 'actual'
};

// =============================================================================
// PROCTORING
// =============================================================================

const PROCTORING_FLAGS = {
    CAMERA_OFF: 'camera_off',
    MIC_OFF: 'mic_off',
    WINDOW_SWITCH: 'window_switch',
    TAB_SWITCH: 'tab_switch',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    MULTIPLE_FACES: 'multiple_faces',
    NO_FACE_DETECTED: 'no_face_detected',
    OBJECT_DETECTED: 'object_detected'
};

const PROCTORING_ALERT_LEVEL = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

// =============================================================================
// STUDENT & PROFILE
// =============================================================================

const STUDENT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    GRADUATED: 'graduated',
    SUSPENDED: 'suspended'
};

const BRANCHES = [
    'Computer Science',
    'Information Technology',
    'Electronics & Communication',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Biotechnology',
    'Other'
];

// =============================================================================
// CODING PLATFORMS
// =============================================================================

const CODING_PLATFORMS = {
    LEETCODE: 'leetcode',
    CODECHEF: 'codechef',
    HACKERRANK: 'hackerrank',
    GITHUB: 'github',
    CODEFORCES: 'codeforces',
    INTERVIEWBIT: 'interviewbit'
};

// =============================================================================
// RESUME
// =============================================================================

const RESUME_STATUS = {
    UPLOADED: 'uploaded',
    PARSING: 'parsing',
    PARSED: 'parsed',
    PARSING_ERROR: 'parsing_error',
    INVALID: 'invalid'
};

const RESUME_PARSE_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// =============================================================================
// NOTIFICATIONS
// =============================================================================

const NOTIFICATION_TYPES = {
    INTERVIEW_SCHEDULED: 'interview_scheduled',
    INTERVIEW_COMPLETED: 'interview_completed',
    RESULT_AVAILABLE: 'result_available',
    SUBSCRIPTION_EXPIRING: 'subscription_expiring',
    SUBSCRIPTION_EXPIRED: 'subscription_expired',
    PAYMENT_DUE: 'payment_due',
    PAYMENT_REMINDER: 'payment_reminder',
    SEAT_ALLOCATED: 'seat_allocated',
    SEAT_RELEASED: 'seat_released',
    PROFILE_UPDATE: 'profile_update',
    SYSTEM_ALERT: 'system_alert',
    ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
    CAMPAIGN_OPENED: 'campaign_opened',
    OFFER_AVAILABLE: 'offer_available',
    DEADLINE_APPROACHING: 'deadline_approaching',
    ACCOUNT_APPROVED: 'account_approved',
    ACCOUNT_REJECTED: 'account_rejected',
    ACCOUNT_SIGNUP: 'account_signup',
    ASSESSMENT_ASSIGNED: 'assessment_assigned',
    DEADLINE_REMINDER: 'deadline_reminder',
    PERFORMANCE_ALERT: 'performance_alert',
    PLACEMENT_DRIVE_ANNOUNCEMENT: 'placement_drive_announcement',
    FOLLOW_UP_PENDING: 'follow_up_pending',
    RECOMMENDATION_ASSIGNED: 'recommendation_assigned',
    BATCH_READINESS_ALERT: 'batch_readiness_alert',
    DECLINING_STUDENT_ALERT: 'declining_student_alert',
    RECOMMENDATION_CREATED: 'recommendation_created'
};

const NOTIFICATION_STATUS = {
    UNREAD: 'unread',
    READ: 'read',
    ARCHIVED: 'archived',
    DELETED: 'deleted'
};

const NOTIFICATION_PRIORITY = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
};

const NOTIFICATION_CHANNELS = {
    IN_APP: 'inApp',
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push'
};

// =============================================================================
// SEAT MANAGEMENT
// =============================================================================

const SEAT_STATUS = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    COMPLETED: 'completed'
};

const SEAT_ACTIONS = {
    ALLOCATED: 'allocated',
    RELEASED: 'released',
    TRANSFERRED: 'transferred',
    SUSPENDED: 'suspended'
};

// =============================================================================
// AUDIT LOG ACTIONS
// =============================================================================

const AUDIT_ACTIONS = {
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    REGISTER: 'REGISTER',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    PASSWORD_RESET: 'PASSWORD_RESET',
    EMAIL_VERIFIED: 'EMAIL_VERIFIED',
    PROFILE_UPDATE: 'PROFILE_UPDATE',
    SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
    SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
    SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
    PAYMENT_INITIATED: 'PAYMENT_INITIATED',
    PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    INTERVIEW_STARTED: 'INTERVIEW_STARTED',
    INTERVIEW_COMPLETED: 'INTERVIEW_COMPLETED',
    INTERVIEW_SUBMITTED: 'INTERVIEW_SUBMITTED',
    RESUME_UPLOADED: 'RESUME_UPLOADED',
    RESUME_PARSED: 'RESUME_PARSED',
    STUDENT_ENROLLED: 'STUDENT_ENROLLED',
    STUDENT_SUSPENDED: 'STUDENT_SUSPENDED',
    ADMIN_ACTION: 'ADMIN_ACTION',
    DATA_EXPORT: 'DATA_EXPORT',
    SYSTEM_ERROR: 'SYSTEM_ERROR',
    SECURITY_ALERT: 'SECURITY_ALERT',
    API_ACCESS: 'API_ACCESS'
};

const AUDIT_RESOURCE_TYPES = {
    USER: 'user',
    SUBSCRIPTION: 'subscription',
    BILLING: 'billing',
    INTERVIEW: 'interview',
    RESUME: 'resume',
    STUDENT: 'student',
    ORGANIZATION: 'organization',
    SYSTEM: 'system',
    SECURITY: 'security'
};

const AUDIT_STATUS = {
    SUCCESS: 'success',
    FAILURE: 'failure',
    PARTIAL: 'partial',
    WARNING: 'warning'
};

const HTTP_METHODS = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE'
};

// =============================================================================
// API RESPONSE CODES
// =============================================================================

const HTTP_STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

// =============================================================================
// ERROR MESSAGES
// =============================================================================

const ERROR_MESSAGES = {
    INVALID_EMAIL: 'Invalid email format',
    WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
    USER_NOT_FOUND: 'User not found',
    EMAIL_EXISTS: 'Email already registered',
    INVALID_CREDENTIALS: 'Invalid email or password',
    TOKEN_EXPIRED: 'Token has expired',
    INVALID_TOKEN: 'Invalid or malformed token',
    UNAUTHORIZED_ACCESS: 'Unauthorized access',
    FORBIDDEN_ACTION: 'You do not have permission to perform this action',
    SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
    SUBSCRIPTION_EXPIRED: 'Subscription has expired',
    INSUFFICIENT_SEATS: 'No available seats for allocation',
    INTERVIEW_NOT_FOUND: 'Interview session not found',
    INTERVIEW_ALREADY_SUBMITTED: 'Interview already submitted',
    INVALID_FILE: 'Invalid file format',
    FILE_SIZE_EXCEEDED: 'File size exceeds maximum limit',
    INTERNAL_SERVER_ERROR: 'An internal server error occurred',
    FEATURE_NOT_AVAILABLE: 'This feature is not available in your subscription plan',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later'
};

// =============================================================================
// PAGINATION
// =============================================================================

const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    MIN_LIMIT: 1
};

// =============================================================================
// RETENTION POLICIES
// =============================================================================

const RETENTION_DAYS = {
    AUDIT_LOG: 90,
    NOTIFICATION: 30,
    SESSION_LOG: 7,
    TMP_FILES: 1
};

// =============================================================================
// RATE LIMITING
// =============================================================================

const RATE_LIMITS = {
    GENERAL: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100
    },
    STRICT: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 5
    },
    AUTH: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 5
    }
};

// =============================================================================
// VALIDATION CONSTRAINTS
// =============================================================================

const VALIDATION = {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 50,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100,
    EMAIL_MAX_LENGTH: 255,
    PHONE_LENGTH: 10,
    CGPA_MIN: 0,
    CGPA_MAX: 10,
    GRADUATION_YEAR_MIN: new Date().getFullYear(),
    GRADUATION_YEAR_MAX: new Date().getFullYear() + 5,
    FILE_SIZE_MAX: 5 * 1024 * 1024,
    RESUME_SIZE_MAX: 5 * 1024 * 1024,
    STRING_MAX_LENGTH: 500,
    ARRAY_MAX_LENGTH: 100,
    MAX_NESTING_DEPTH: 10
};

// =============================================================================
// API ENDPOINTS
// =============================================================================

const API_BASE_PATH = '/api';

const ENDPOINTS = {
    AUTH: '/auth',
    USERS: '/users',
    STUDENTS: '/students',
    SUBSCRIPTIONS: '/subscriptions',
    BILLING: '/billing',
    INTERVIEWS: '/interviews',
    RESUMES: '/resumes',
    ORGANIZATIONS: '/organizations',
    ADMIN: '/admin',
    NOTIFICATIONS: '/notifications'
};

// =============================================================================
// EXPORT ALL CONSTANTS
// =============================================================================

module.exports = {
    USER_ROLES,
    USER_STATUS,
    SUBSCRIPTION_PLANS,
    STUDENT_PLANS,
    PLAN_REGISTRIES,
    getPlan,
    SUBSCRIPTION_STATUS,
    BILLING_CYCLE,
    PAYMENT_STATUS,
    PAYMENT_METHODS,
    ORGANIZATION_TYPES,
    ORGANIZATION_STATUS,
    VERIFICATION_DOCUMENT_TYPES,
    TAX_FILING_STATUS,
    INTERVIEW_ROUNDS,
    DIFFICULTY_LEVELS,
    INTERVIEW_STATUS,
    INTERVIEW_TYPE,
    PROCTORING_FLAGS,
    PROCTORING_ALERT_LEVEL,
    STUDENT_STATUS,
    BRANCHES,
    CODING_PLATFORMS,
    RESUME_STATUS,
    RESUME_PARSE_STATUS,
    NOTIFICATION_TYPES,
    NOTIFICATION_STATUS,
    NOTIFICATION_PRIORITY,
    NOTIFICATION_CHANNELS,
    SEAT_STATUS,
    SEAT_ACTIONS,
    AUDIT_ACTIONS,
    AUDIT_RESOURCE_TYPES,
    AUDIT_STATUS,
    HTTP_METHODS,
    HTTP_STATUS_CODES,
    ERROR_MESSAGES,
    PAGINATION,
    RETENTION_DAYS,
    RATE_LIMITS,
    VALIDATION,
    API_BASE_PATH,
    ENDPOINTS,
    TAX_RATE
};
