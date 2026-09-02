# College Admin APIs

Base path for college admin routes: `/college-admin`, `/recommendations`, `/subscriptions`, `/billing`

> All routes require `college-admin` role unless otherwise noted.
> Subscription features are checked at runtime for batch management.

---

## Organization Profile

### GET `/college-admin/organization/me`
Get organization profile.
- **Response 200:** `{ "success": true, "message": "...", "data": { "user": {...}, "organization": {...}, "subscription": {...}, "seatManagement": {...} } }`

### PUT `/college-admin/organization/me`
Update organization profile.
- **Request Body:**
```json
{
  "organizationName": "string",
  "organizationType": "college|university|institute|training_center",
  "registrationNumber": "string",
  "address": { "street": "...", "city": "...", "state": "...", "zipCode": "...", "country": "..." },
  "phone": "string",
  "website": "string (URI)",
  "primaryContactPerson": { "name": "...", "email": "...", "phone": "...", "designation": "..." },
  "totalStudents": 0,
  "totalFaculty": 0,
  "establishedYear": 2000,
  "accreditation": "string",
  "brandColor": "string",
  "status": "active|inactive|suspended|pending_verification"
}
```
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### POST `/college-admin/organization/me/verification-documents`
Upload verification document.
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `document` (file), `documentType` (registration_certificate|udyam_aadhar|gst_certificate|pan_certificate)
- **Response 201:** `{ "success": true, "message": "...", "data": {...} }`

---

## Dashboard

### GET `/college-admin/dashboard`
Get dashboard summary.
- **Response 200:**
```json
{
  "success": true,
  "data": {
    "organization": {...},
    "subscription": {...},
    "seatManagement": {...},
    "studentCount": 0,
    "batchCount": 0,
    "campaignCount": 0,
    "activeCampaignCount": 0,
    "assignedCampaignCount": 0,
    "usagePercentage": 0,
    "analytics": {
      "totalInterviewSessions": 0,
      "averageScore": 0,
      "averageRiskScore": 0,
      "highRiskSessions": 0,
      "disqualifiedSessions": 0
    }
  }
}
```

### GET `/college-admin/analytics/dashboard`
Get analytics dashboard.
- **Query Params:** `days` (default 30)
- **Response 200:** `{ "success": true, "data": { "period": {...}, "students": {...}, "interviewPerformance": {...}, "proctorRisk": {...}, "trend": [...] } }`

### GET `/college-admin/analytics/students`
Get students with analytics.
- **Query Params:** `page`, `limit`, `riskLevel`, `minScore`, `maxRisk`
- **Response 200:** `{ "success": true, "data": { "students": [...] }, "pagination": {...} }`

### GET `/analytics/proctor/dashboard`
Get proctoring risk dashboard for college admin.
- **Query Params:** `days` (default 30)
- **Response 200:** `{ "success": true, "data": { "summary": {...}, "riskDistribution": [...], "dailyTrend": [...], "topViolationTypes": [...], "highRiskSessions": [...], "recentViolations": [...] } }`

---

## Batches

### POST `/college-admin/batches`
Create a new batch.
- **Request Body:**
```json
{
  "batchName": "string (min 2, max 120)",
  "batchCode": "string (optional, auto-generated if omitted)",
  "academicYear": "string (min 2, max 20)",
  "graduationYear": "number (2000-2100)",
  "department": "string (min 2, max 120)",
  "section": "string (optional)",
  "description": "string (max 2000)",
  "placementOfficerNotes": "string (max 2000)"
}
```
- **Response 201:** `{ "success": true, "message": "Batch created successfully.", "data": {...} }`
- **Response 403:** No active subscription or batch management feature not included

### GET `/college-admin/batches`
List batches with pagination.
- **Query Params:** `page`, `limit`, `status`, `department`, `batchName`, `graduationYear`, `academicYear`
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### GET `/college-admin/batches/:batchId`
Get batch by ID.
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### PATCH `/college-admin/batches/:batchId`
Update batch.
- **Request Body:** Any of: `batchName`, `academicYear`, `graduationYear`, `department`, `section`, `description`, `placementOfficerNotes`, `status`
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### DELETE `/college-admin/batches/:batchId/archive`
Archive batch.
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### POST `/college-admin/batches/:batchId/students`
Add students to batch.
- **Request Body:**
```json
{
  "studentIds": ["string"] or "string",
  "notes": "string (max 500)"
}
```
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### DELETE `/college-admin/batches/:batchId/students`
Remove students from batch.
- **Request Body:** Same as add students
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### GET `/college-admin/batches/:batchId/campaigns`
Get campaigns for a batch.
- **Response 200:** `{ "success": true, "message": "...", "data": [...] }`

---

## Students

### GET `/college-admin/students`
List students in organization.
- **Query Params:** `page`, `limit`, `search`, `branch`, `graduationYear`
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### GET `/college-admin/students/:studentId`
Get student details.
- **Response 200:** `{ "success": true, "message": "...", "data": { "student": {...}, "profile": {...} } }`

---

## Seats

### GET `/college-admin/seats/summary`
Get seat allocation summary.
- **Response 200:**
```json
{
  "success": true,
  "data": {
    "subscription": {...},
    "seatManagement": {...},
    "usagePercentage": 0
  }
}
```

### POST `/college-admin/seats/allocate`
Allocate seat to student.
- **Request Body:** `{ "studentId": "string", "notes": "string (max 500)" }`
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### POST `/college-admin/seats/release`
Release seat from student.
- **Request Body:** `{ "studentId": "string", "reason": "string (max 500)" }`
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

---

## Campaigns

### POST `/college-admin/campaigns`
Create campaign.
- **Request Body:**
```json
{
  "title": "string (min 2, max 200)",
  "description": "string (max 2000)",
  "targetDepartment": ["string"] or "string",
  "targetBatch": ["number"] or "number",
  "config": { "hasAptitude": true, "hasCoding": true, "hasTechnical": true, "hasHr": true, "hasBehavioral": true, "companyTemplate": "string" },
  "deadline": "ISO date string",
  "isActive": true,
  "maxStudents": 10000
}
```
- **Response 201:** `{ "success": true, "message": "...", "data": {...} }`

### GET `/college-admin/campaigns`
List campaigns.
- **Query Params:** `page`, `limit`
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### POST `/college-admin/campaigns/assign-to-batches`
Assign campaign to batches.
- **Request Body:**
```json
{
  "campaignId": "string",
  "batchIds": ["string"] or "string",
  "notifyStudents": true
}
```
- **Response 200:** `{ "success": true, "message": "...", "data": { "campaign": {...}, "assignedBatchCount": 0, "notifiedStudentCount": 0 } }`

### GET `/college-admin/campaigns/:campaignId/assignments`
Get campaign assignments.
- **Response 200:** `{ "success": true, "message": "...", "data": [...] }`

### PATCH `/college-admin/campaigns/:campaignId/assignments/:batchId/revoke`
Revoke campaign assignment from batch.
- **Response 200:** `{ "success": true, "message": "...", "data": { "campaignId": "...", "batchId": "..." } }`

### PATCH `/college-admin/campaigns/:campaignId`
Update campaign.
- **Request Body:** Any of: `title`, `description`, `targetDepartment`, `targetBatch`, `config`, `deadline`, `isActive`
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### POST `/college-admin/campaigns/:campaignId/assign-students`
Assign campaign to specific students.
- **Request Body:**
```json
{
  "studentIds": ["string"] or "string",
  "notifyStudents": true
}
```
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### GET `/college-admin/campaigns/:campaignId/results`
Get campaign results.
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

---

## College Admin Insights

### GET `/college-admin/insights/students-missed-aptitude`
Get students who missed aptitude rounds.
- **Query Params:** `page`, `limit`, `batchId`, `graduationYear`
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### GET `/college-admin/insights/top-candidates`
Get top placement-ready candidates.
- **Query Params:** `page`, `limit`, `minReadinessScore` (default 60), `graduationYear`, `batchId`
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### GET `/college-admin/insights/compare-batches`
Compare batches.
- **Query Params:** `graduationYears` (array or comma-separated) OR `batchIds` (array or comma-separated)
- **Response 200:** `{ "success": true, "data": [...] }`
- **Note:** At least 2 batches required

### GET `/college-admin/insights/workshop-recommendations`
Generate workshop recommendations.
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### GET `/college-admin/insights/university-level`
Get university-level AI insights.
- **Query Params:** `days` (default 90, min 7, max 365)
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### GET `/college-admin/insights/batch-readiness/:batchId`
Get batch readiness stats.
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### GET `/college-admin/insights/declining-students`
Get declining students.
- **Query Params:** `batchId`, `graduationYear`, `page`, `limit`
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### GET `/college-admin/insights/ai-comparative-report`
Get AI comparative report.
- **Query Params:** `batchIds`, `graduationYears`, `includeStudentProfiles` (default false)
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### POST `/college-admin/insights/recalculate-scores`
Recalculate readiness scores.
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

---

## Follow-ups & Notifications

### POST `/college-admin/follow-ups`
Create follow-up schedule.
- **Request Body:**
```json
{
  "targetType": "campaign|student|batch",
  "campaignId": "string (optional)",
  "studentId": "string (optional)",
  "batchId": "string (optional)",
  "followUpType": "assessment_assigned|deadline_reminder|performance_alert|placement_drive|follow_up_pending|recommendation_assigned",
  "scheduleDate": "ISO date string",
  "title": "string (min 2, max 200)",
  "message": "string (max 1000)",
  "description": "string (max 2000)",
  "actionUrl": "string (URI)",
  "actionText": "string (max 100)",
  "channels": { "inApp": true, "email": true },
  "recipientRole": "student|college-admin|super-admin"
}
```
- **Response 201:** `{ "success": true, "message": "...", "data": {...} }`

### POST `/college-admin/notifications/send-bulk`
Send bulk notification.
- **Request Body:**
```json
{
  "targetType": "students|batch",
  "batchId": "string (optional)",
  "title": "string (min 2, max 200)",
  "message": "string (max 1000)",
  "description": "string (max 2000)",
  "actionUrl": "string (URI)",
  "actionText": "string (max 100)",
  "sendEmail": false,
  "priority": "low|normal|high|urgent"
}
```
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

---

## Recommendations

### POST `/recommendations`
Create recommendation.
- **Request Body:**
```json
{
  "recommendationType": "workshop|bootcamp|training-program|certification",
  "title": "string (min 2, max 200)",
  "description": "string (max 2000)",
  "targetAudience": { "departments": [...], "graduationYears": [...], "minReadinessScore": 0, "maxRiskScore": 0 },
  "priority": "high|medium|low",
  "estimatedImpact": "high|medium|low",
  "reason": "string (max 1000)",
  "skillGaps": [{ "skill": "string", "studentCount": 0 }],
  "affectedStudentCount": 0,
  "expiresAt": "ISO date string",
  "externalUrl": "string (URI)",
  "externalPlatform": "internal|udemy|coursera|linkedin_learning|youtube|custom|other",
  "tags": ["string"]
}
```
- **Response 201:** `{ "success": true, "message": "...", "data": {...} }`

### GET `/recommendations`
List recommendations.
- **Query Params:** `page`, `limit`
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### GET `/recommendations/assignments`
Get recommendation assignments.
- **Query Params:** `page`, `limit`
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### GET `/recommendations/:recommendationId`
Get recommendation by ID.
- **Response 200:** `{ "success": true, "data": {...} }`

### PUT `/recommendations/:recommendationId`
Update recommendation.
- **Request Body:** Partial recommendation object
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### DELETE `/recommendations/:recommendationId`
Delete recommendation.
- **Response 200:** `{ "success": true, "message": "Recommendation deleted successfully." }`

### POST `/recommendations/:recommendationId/assign-batch`
Assign recommendation to batch.
- **Request Body:** `{ "batchId": "string", "deadline": "ISO date string", "notifyStudents": true }`
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### POST `/recommendations/:recommendationId/assign-student`
Assign recommendation to student.
- **Request Body:** `{ "studentId": "string", "deadline": "ISO date string", "notifyStudent": true }`
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

---

## Student Intelligence Profile

### PUT `/college-admin/students/:studentId/intelligence-profile`
Update student intelligence profile.
- **Request Body:**
```json
{
  "techScore": 0,
  "aptitudeScore": 0,
  "codingScore": 0,
  "communicationScore": 0,
  "atsScore": 0,
  "skillGaps": ["string"],
  "proficiencyLevels": {},
  "linkedinProfile": "string (URI)",
  "githubProfile": "string (URI)",
  "kaggleProfile": "string (URI)"
}
```
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### GET `/college-admin/students/:studentId/score-history`
Get student score history.
- **Query Params:** `page`, `limit`, `trend` (improving|declining|stable)
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

---

## Reports

### GET `/college-admin/reports/dashboard`
Get organization performance dashboard.
- **Query Params:** `format` (pdf|csv), `from`, `to`, `granularity`, `branch`, `graduationYear`, `targetRole`
- **Response 200:** `{ "success": true, "data": {...} }`

### GET `/college-admin/reports/students/:studentId`
Get student report.
- **Query Params:** Same as dashboard
- **Response 200:** `{ "success": true, "data": {...} }`

### GET `/college-admin/reports/students/:studentId/dashboard`
Get student performance dashboard for college admin.
- **Query Params:** Same as dashboard
- **Response 200:** `{ "success": true, "data": {...} }`

### GET `/college-admin/reports/students/:studentId/download`
Download student report.
- **Query Params:** Same as dashboard
- **Response:** PDF or CSV file

### GET `/college-admin/reports/batches/:batchId`
Get batch performance report.
- **Query Params:** Same as dashboard
- **Response 200:** `{ "success": true, "data": {...} }`

### GET `/college-admin/reports/batches/:batchId/dashboard`
Get batch performance dashboard.
- **Query Params:** Same as dashboard
- **Response 200:** `{ "success": true, "data": {...} }`

### GET `/college-admin/reports/batches/:batchId/download`
Download batch performance report.
- **Query Params:** Same as dashboard
- **Response:** PDF or CSV file

---

## Subscriptions

### POST `/subscriptions/create`
Create subscription.
- **Request Body:**
```json
{
  "organizationId": "string",
  "planId": "basic|pro|enterprise",
  "seats": 1,
  "billingCycle": "monthly|quarterly|yearly",
  "autoRenew": true
}
```
- **Response 201:** `{ "success": true, "message": "...", "data": {...} }`

### GET `/subscriptions/current/:organizationId`
Get current subscription.
- **Response 200:** `{ "success": true, "data": { "subscription": {...}, "seatManagement": {...} } }`

### GET `/subscriptions/details/:subscriptionId`
Get subscription details.
- **Response 200:** `{ "success": true, "data": { "subscription": {...}, "seatManagement": {...}, "billingHistory": [...] } }`

### PUT `/subscriptions/upgrade`
Upgrade subscription.
- **Request Body:** `{ "subscriptionId": "string", "newPlanId": "basic|pro|enterprise", "newSeats": 1 }`
- **Response 200:** `{ "success": true, "message": "...", "data": { "subscription": {...}, "upgradeCost": 0, "daysRemaining": 0 } }`

### PUT `/subscriptions/downgrade`
Downgrade subscription.
- **Request Body:** Same as upgrade
- **Response 200:** `{ "success": true, "message": "...", "data": { "subscription": {...} } }`
- **Note:** Cannot downgrade if used seats exceed new plan capacity

### POST `/subscriptions/cancel`
Cancel subscription.
- **Request Body:** `{ "subscriptionId": "string", "reason": "string (max 500)" }`
- **Response 200:** `{ "success": true, "message": "Subscription cancelled successfully" }`

### GET `/subscriptions/usage/:subscriptionId`
Get subscription usage.
- **Response 200:** `{ "success": true, "data": { "subscription": {...}, "usage": {...}, "limits": {...}, "features": {...} } }`

### GET `/subscriptions/features/:subscriptionId`
Get available features.
- **Response 200:** `{ "success": true, "data": { "enabledFeatures": [...], "allFeatures": {...}, "limits": {...} } }`

### POST `/subscriptions/renew`
Renew subscription.
- **Request Body:** `{ "subscriptionId": "string" }`
- **Response 200:** `{ "success": true, "message": "...", "data": { "subscription": {...} } }`

---

## Billing & Payments

### GET `/billing/invoices`
Get invoices list.
- **Query Params:** `organizationId`, `status` (pending|completed|failed|refunded), `page`, `limit`
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### GET `/billing/invoices/:invoiceId`
Get invoice by ID.
- **Response 200:** `{ "success": true, "data": {...} }`

### POST `/billing/create-invoice`
Create invoice.
- **Roles:** `college-admin`, `super-admin`
- **Request Body:** `{ "subscriptionId": "string", "subtotal": 0, "tax": 0, "discount": 0 }`
- **Response 201:** `{ "success": true, "message": "...", "data": {...} }`

### POST `/billing/initiate-payment`
Initiate Razorpay payment.
- **Request Body:**
```json
{
  "subscriptionId": "string (optional if billingId provided)",
  "billingId": "string (optional)",
  "amount": 0,
  "currency": "INR",
  "paymentMethod": "credit_card|debit_card|upi|net_banking|bank_transfer",
  "customerEmail": "string",
  "customerPhone": "string"
}
```
- **Response 200:**
```json
{
  "success": true,
  "data": {
    "orderId": "string",
    "paymentLink": "https://...",
    "amount": 0,
    "currency": "INR"
  }
}
```

### POST `/billing/verify-payment`
Verify Razorpay payment signature.
- **Request Body:**
```json
{
  "razorpayOrderId": "string",
  "razorpayPaymentId": "string",
  "razorpaySignature": "string"
}
```
- **Response 200:** `{ "success": true, "message": "...", "data": { "paymentId": "...", "status": "completed", "amount": 0 } }`

### POST `/billing/retry-payment`
Retry failed payment.
- **Request Body:** `{ "paymentLogId": "string", "billingId": "string" }`
- **Response 200:** `{ "success": true, "message": "...", "data": { "orderId": "...", "paymentLink": "...", "retryAttempt": 1 } }`

### POST `/billing/refund`
Process refund.
- **Roles:** `college-admin`, `super-admin`
- **Request Body:**
```json
{
  "paymentId": "string",
  "billingId": "string",
  "amount": 0,
  "reason": "string (max 500)"
}
```
- **Response 200:** `{ "success": true, "message": "...", "data": { "refundId": "...", "amount": 0, "status": "..." } }`

### GET `/billing/invoices/:invoiceId/download-pdf`
Download invoice PDF.
- **Response:** PDF file attachment

### POST `/billing/send-reminder`
Send payment reminder.
- **Request Body:** `{ "billingId": "string" }`
- **Response 200:** `{ "success": true, "message": "Payment reminder sent successfully" }`

### GET `/billing/stats`
Get billing statistics.
- **Query Params:** `organizationId` (optional)
- **Response 200:** `{ "success": true, "data": { "stats": [...], "totalRevenue": 0, "overdueInvoices": 0 } }`
