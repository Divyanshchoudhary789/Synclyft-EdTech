# Student APIs

Base path for student-specific routes: `/auth`, `/profile`, `/interview`, `/resume`, `/insights`, `/analytics`, `/notifications`

---

## Authentication

### POST `/auth/signup/student/send-otp`
Send OTP for student signup.
- **Rate Limited:** 30s cooldown
- **Request Body:**
```json
{
  "name": "string (min 2, max 50)",
  "email": "string (valid email)",
  "password": "string (min 8, must contain upper, lower, number, special char)",
  "organization": "string (min 2, max 100)",
  "role": "student"
}
```
- **Response 200:** `{ "success": true, "message": "OTP sent Successfully" }`
- **Response 400:** Email already used, missing fields

### POST `/auth/signup/student/verify-otp`
Verify OTP and create student account.
- **Request Body:**
```json
{
  "email": "string",
  "otp": "string (6 digits)"
}
```
- **Response 201:** `{ "message": "Account Created Successfully", "user": {...} }`
- **Response 400:** Invalid/expired OTP

### POST `/auth/login`
Login with email and password.
- **Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
- **Response 200:** `{ "success": true, "message": "Login Successful.", "user": {...} }`
- Sets httpOnly cookie `token`

### POST `/auth/login/send-otp`
Send OTP for login.
- **Request Body:** `{ "email": "string" }`
- **Response 200:** `{ "message": "OTP sent Successfully" }`
- **Response 404:** User not found
- **Response 403:** Account pending/rejected

### POST `/auth/login/verify-otp`
Verify login OTP.
- **Request Body:** `{ "email": "string", "otp": "string" }`
- **Response 200:** `{ "message": "Login Successful", "user": {...}, "token": "..." }`

### GET `/auth/auth/google`
Initiate Google OAuth flow. Redirects to Google.

### GET `/auth/auth/google/callback`
Google OAuth callback. On success, returns user + sets cookie.

### GET `/auth/auth/linkedin`
Initiate LinkedIn OAuth flow.

### GET `/auth/auth/linkedin/callback`
LinkedIn OAuth callback.

### GET `/auth/auth/github`
Initiate GitHub OAuth flow.

### GET `/auth/auth/github/callback`
GitHub OAuth callback.

### POST `/auth/logout`
Clears the auth cookie.
- **Response 200:** `{ "message": "Logged Out Successfully" }`

### GET `/auth/user`
Get current authenticated user.
- **Response 200:** `{ "message": "User Fetched Successfully", "user": {...} }`

---

## Password Reset

### POST `/password-reset/forgot`
Request password reset email.
- **Rate Limited:** 30s cooldown
- **Request Body:** `{ "email": "string" }`
- **Response 200:** `{ "success": true, "message": "If an account exists..." }`

### POST `/password-reset/reset`
Reset password with token.
- **Request Body:**
```json
{
  "token": "string (from email link)",
  "password": "string (min 8 chars)"
}
```
- **Response 200:** `{ "success": true, "message": "Password reset successful..." }`

### GET `/password-reset/verify/:token`
Verify reset token validity.
- **Response 200:** `{ "success": true, "valid": true/false }`

---

## Student Profile

### GET `/profile/get-profile`
Get student profile details.
- **Response 200:** `{ "success": true, "profile": {...} }`

### POST `/profile/add/profile-details`
Add complete profile details (requires resume upload).
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `resume` (file), `branch`, `graduationYear`, `cgpa`, `attendance`, `targetRole`, `expectedCTC` (object with min/max), `skills` (comma-separated or array), `projects`, `preferredInterviewLanguage`, `codingLanguageChoices`
- **Response 200:** `{ "success": true, "message": "Profile details Added Successfully" }`

### PUT `/profile/update/profile-picture`
Update profile picture.
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `image` (file)
- **Response 200:** `{ "success": true, "message": "User Profile Picture Updated Successfully." }`

### PUT `/profile/update/profile`
Update profile details with optional resume.
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `resume` (optional file), plus same fields as add profile
- **Response 200:** `{ "success": true, "message": "Student Profile Updated Successfully.", "profile": {...} }`

---

## Coding Profile Verification

### POST `/profile/initiate`
Initiate verification for coding platform.
- **Request Body:**
```json
{
  "platform": "leetcode|github|hackerrank|codechef|gfg|codeforces",
  "username": "string"
}
```
- **Response 200:** `{ "message": "Verification token generated...", "token": "..." }`

### POST `/profile/verify`
Verify platform profile (token must be in bio).
- **Request Body:** `{ "platform": "string" }`
- **Response 200:** `{ "message": "...verified successfully!", "data": {...} }`

### POST `/profile/sync`
Sync stats from verified platform.
- **Request Body:** `{ "platform": "string" }`
- **Response 200:** `{ "message": "Stats synced successfully!", "stats": {...} }`

---

## Student Dashboard

### GET `/profile/dashboard`
Get dashboard summary.
- **Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "profile": {...},
    "recentSessions": [...],
    "recentInsights": [...],
    "unreadNotifications": 0,
    "verifiedPlatforms": ["leetcode"],
    "codingProfiles": {...}
  }
}
```

### GET `/profile/progress`
Get progress summary.
- **Response 200:**
```json
{
  "success": true,
  "data": {
    "placementReadinessScore": 0,
    "sessionCount": 0,
    "completedCount": 0,
    "insightCount": 0,
    "unreadNotifications": 0,
    "verifiedPlatforms": 0,
    "profile": {...}
  }
}
```

### GET `/profile/notifications`
Get notifications with pagination.
- **Query Params:** `page` (default 1), `limit` (default 20), `status` (all/unread/read/archived), `type` (string)
- **Response 200:** `{ "success": true, "notifications": [...], "pagination": {...} }`

### GET `/profile/analytics/dashboard`
Get student analytics dashboard.
- **Query Params:** `days` (default 90)
- **Response 200:** `{ "success": true, "data": { "summary": {...}, "performanceTrend": [...], "recentSessions": [...] } }`

### GET `/profile/batch/me`
Get student's active batch.
- **Response 200:** `{ "success": true, "data": {...} }`
- **Response 404:** No active batch found

### GET `/profile/campaigns`
Get campaign inbox.
- **Query Params:** `page` (default 1), `limit` (default 10)
- **Response 200:** `{ "success": true, "data": { "batch": {...}, "campaigns": [...] }, "pagination": {...} }`

### GET `/profile/campaigns/:campaignId`
Get specific campaign details.
- **Response 200:** `{ "success": true, "data": {...} }`

---

## Student Reports

### GET `/profile/reports/dashboard`
Get student performance dashboard.
- **Query Params:** `format` (pdf|csv, default pdf), `from` (ISO date), `to` (ISO date), `granularity` (daily|weekly|monthly), `branch`, `graduationYear`, `targetRole`
- **Response 200:** `{ "success": true, "data": {...} }`

### GET `/profile/reports/summary`
Get student performance report summary.
- **Query Params:** Same as dashboard
- **Response 200:** `{ "success": true, "data": {...} }`

### GET `/profile/reports/download`
Download student performance report.
- **Query Params:** Same as dashboard
- **Response:** PDF or CSV file attachment

---

## Interview Sessions

### POST `/interview/initialize`
Initialize a new interview session.
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `resume` (optional file), `jobDescription`, `targetRole`, `selectedRounds` (array of strings: aptitude, coding, technical, hr), `preferredCodingLanguage`, `campaignId` (optional)
- **Response 201:** `{ "success": true, "sessionId": "..." }`

### POST `/interview/session/:sessionId/terminate`
End interview session and generate report.
- **Response 200:** `{ "success": true, "summary": {...} }`

### GET `/interview/coding-round-questions/:sessionId`
Get coding round questions.
- **Query Params:** `page` (default 1)
- **Response 200:** `{ "success": true, "message": "...", "question": {...} }`

### POST `/interview/session/:sessionId/submit-coding`
Submit coding solution.
- **Request Body:**
```json
{
  "questionId": "string",
  "code": "string",
  "language": "string"
}
```
- **Response 200:**
```json
{
  "success": true,
  "metadata": { "language": "...", "testCasesPassed": 0, "totalTestCases": 100, "runtimeMs": 0, "memoryKb": 0 },
  "scoreEarned": 0
}
```

### GET `/interview/technical-round-questions/:sessionId`
Get technical round question.
- **Response 200:** `{ "success": true, "message": "...", "question": {...} }`

### POST `/interview/session/:sessionId/submit-technical`
Submit technical round solution.
- **Request Body:** Same as coding submission
- **Response 200:** Same format as coding submission

---

## Resume Builder

### POST `/resume/resume/save`
Save or update resume.
- **Request Body:** Resume data fields (excluding `resumeId` for new)
- **Response 200:** `{ "success": true, "message": "...", "resume": {...} }`

### GET `/resume/resume/history`
Get resume history.
- **Response 200:** `{ "success": true, "resumes": [...] }`

### GET `/resume/resume/:id`
Get specific resume.
- **Response 200:** `{ "success": true, "resume": {...} }`

### POST `/resume/resume/optimize-ai`
AI-powered ATS optimization.
- **Request Body:**
```json
{
  "targetRole": "string",
  "experienceLevel": "string",
  "targetJD": "string",
  "personalInfo": {...},
  "skills": [...],
  "experience": [...],
  "projects": [...]
}
```
- **Response 200:** `{ "success": true, "suggestions": { "atsScoreEstimate": 78, "missingKeywords": [...], ... } }`

---

## Student Insights

### GET `/insights/dashboard`
Get dashboard analytics.
- **Response 200:** `{ "success": true, "data": {...} }`

### GET `/insights/reports`
Get historical interview reports.
- **Query Params:** `page`, `limit`, `roundType`, `status`, `from`, `to`, `minScore`, `maxScore`
- **Response 200:** `{ "success": true, "reports": [...], "pagination": {...} }`

### POST `/insights/study-plan/generate`
Generate AI study plan.
- **Request Body:**
```json
{
  "sourceSessionId": "string (optional)",
  "targetRole": "string (optional)",
  "jobDescription": "string (optional, max 5000)"
}
```
- **Response 201:** `{ "success": true, "message": "AI study plan generated successfully.", "data": {...} }`

### GET `/insights/study-plan`
List all study plans grouped by role.
- **Response 200:** `{ "success": true, "data": { "groupedByRole": [...], "summary": {...} } }`

### GET `/insights/study-plan/:planId`
Get study plan details.
- **Response 200:** `{ "success": true, "data": {...} }`

### PUT `/insights/study-plan/:planId/status`
Update study plan status.
- **Request Body:** `{ "status": "active|paused|completed|archived" }`
- **Response 200:** `{ "success": true, "data": { "id": "...", "status": "...", "completedAt": null } }`

---

## Student Analytics

### GET `/analytics/interview/sessions`
Get interview session analytics.
- **Query Params:** `page`, `limit`
- **Response 200:** `{ "success": true, "data": { "analytics": [...], "summary": {...} }, "pagination": {...} }`

### GET `/analytics/interview/sessions/:sessionId/insights`
Get detailed insights for a session.
- **Response 200:** `{ "success": true, "data": { "session": {...}, "analytics": {...}, "roundDetails": [...] } }`

### GET `/analytics/proctor/student-report`
Get proctor risk report for student.
- **Query Params:** `page`, `limit`
- **Response 200:** `{ "success": true, "data": { "reports": [...], "summary": {...} }, "pagination": {...} }`

### GET `/analytics/activity/student`
Get student activity timeline.
- **Query Params:** `page`, `limit`, `action`, `resourceType`, `from`, `to`
- **Response 200:** `{ "success": true, "data": { "timeline": [...] }, "pagination": {...} }`

---

## Notifications (Student)

All notification endpoints require authentication. Role-specific filtering applies.

### GET `/notifications`
Get notifications.
- **Query Params:** `status`, `type`, `page`, `limit`
- **Response 200:** `{ "success": true, "notifications": [...], "pagination": {...} }`

### GET `/notifications/unread-count`
Get unread count.
- **Response 200:** `{ "success": true, "count": 0 }`

### PATCH `/notifications/:id/read`
Mark notification as read.
- **Response 200:** `{ "success": true, "data": {...} }`

### PATCH `/notifications/read-all`
Mark all as read.
- **Response 200:** `{ "success": true, "modifiedCount": 0 }`

### PATCH `/notifications/:id/archive`
Archive notification.
- **Response 200:** `{ "success": true, "data": {...} }`

### PATCH `/notifications/:id/restore`
Restore archived notification.
- **Response 200:** `{ "success": true, "data": {...} }`

### DELETE `/notifications/:id`
Delete notification.
- **Response 200:** `{ "success": true, "message": "Notification deleted" }`

### GET `/notifications/preferences`
Get notification preferences.
- **Response 200:** `{ "success": true, "data": {...} }`

### PUT `/notifications/preferences`
Update notification preferences.
- **Request Body:**
```json
{
  "globalChannels": { "inApp": true, "email": true },
  "eventPreferences": {
    "interview_scheduled": { "inApp": true, "email": true }
  }
}
```
- **Response 200:** `{ "success": true, "data": {...} }`
