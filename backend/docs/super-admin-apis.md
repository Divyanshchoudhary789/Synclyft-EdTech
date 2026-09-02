# Super Admin APIs

Base path: `/super-admin`, `/subscriptions` (super-admin routes), `/billing` (super-admin routes)

> All routes require `super-admin` role unless otherwise noted.

---

## Platform Overview

### GET `/super-admin/overview`
Get platform overview.
- **Response 200:**
```json
{
  "success": true,
  "data": {
    "users": { "students": 0, "collegeAdmins": 0, "superAdmins": 0, "pendingAdmins": 0 },
    "organizations": 0,
    "subscriptions": { "activeSubscriptions": 0 },
    "billing": { "invoices": 0, "completedInvoices": 0 },
    "seats": { "totalSeats": 0, "usedSeats": 0, "usagePercentage": 0 },
    "verifiedProfiles": 0
  }
}
```

### GET `/super-admin/analytics/overview`
Get super admin analytics overview.
- **Query Params:** `days` (default 30)
- **Response 200:** `{ "success": true, "data": { "interviewStats": {...}, "proctorStats": {...}, "topViolationTypes": [...], "trendData": [...] } }`

### GET `/super-admin/analytics/risk-trend`
Get risk trend by college.
- **Query Params:** `page`, `limit`, `days` (default 30), `riskLevel` (optional)
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### GET `/super-admin/analytics/violations`
Get violation analytics.
- **Query Params:** `days` (default 30)
- **Response 200:** `{ "success": true, "data": { "violationPatterns": [...], "roundDistribution": [...], "timeDistribution": [...] } }`

### GET `/super-admin/analytics/interview-heatmap`
Get interview performance heatmap.
- **Query Params:** `days` (default 90)
- **Response 200:** `{ "success": true, "data": { "heatmap": [...], "dayOfWeekHeatmap": [...] } }`

---

## Pending Approvals

### GET `/super-admin/pending-approvals`
Get pending college admin requests.
- **Query Params:** `page`, `limit`
- **Response 200:** `{ "success": true, "pendingCollegeAdmins": [...], "pagination": {...} }`

### PATCH `/super-admin/approve-college-admin/:id`
Approve college admin.
- **Response 200:** `{ "success": true, "message": "College Admin account for ... has been successfully approved." }`

### PATCH `/super-admin/reject-college-admin/:id`
Reject college admin.
- **Request Body:** `{ "reason": "string (optional)" }`
- **Response 200:** `{ "success": true, "message": "College Admin account for ... has been rejected." }`

---

## Organizations

### GET `/super-admin/organizations`
Get all organizations.
- **Query Params:** `page`, `limit`, `status`, `isVerified`, `search`
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### PATCH `/super-admin/organizations/:organizationId/status`
Update organization status.
- **Request Body:** `{ "status": "string", "isVerified": true/false }`
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

---

## Audit Logs

### GET `/super-admin/audit-logs`
Get audit logs.
- **Query Params:** `page`, `limit`, `userId`, `userEmail`, `userRole`, `action`, `resourceType`, `resourceId`, `status`, `method`, `search`, `from`, `to`, `hasSensitiveData`
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### GET `/super-admin/audit-logs/summary`
Get audit log summary.
- **Query Params:** Same as audit-logs
- **Response 200:** `{ "success": true, "data": { "total": 0, "recentCount": 0, "sensitiveCount": 0, "actionBreakdown": [...], "roleBreakdown": [...], "statusBreakdown": [...] } }`

### GET `/super-admin/audit-logs/:auditLogId`
Get audit log by ID.
- **Response 200:** `{ "success": true, "message": "...", "data": {...} }`

### GET `/super-admin/audit-logs/export`
Export audit logs.
- **Query Params:** `format` (csv|json, default csv), `limit` (max 5000), plus same filters as audit-logs
- **Response:** CSV or JSON file download

---

## Super Admin Subscriptions

> These routes are under `/subscriptions` but require `super-admin` role.

### GET `/subscriptions/all`
Get all subscriptions (super admin view).
- **Query Params:** `page`, `limit`, `status`
- **Response 200:** `{ "success": true, "data": [...], "pagination": {...} }`

### GET `/subscriptions/stats`
Get subscription statistics.
- **Response 200:** `{ "success": true, "data": { "stats": [...], "totalActive": 0, "totalExpired": 0, "expiringIn30Days": 0 } }`

---

## Super Admin Billing

> These routes are under `/billing` but require `super-admin` role for certain actions.

- `POST /billing/create-invoice` — requires `college-admin` or `super-admin`
- `POST /billing/refund` — requires `college-admin` or `super-admin`
- `GET /billing/stats` — available to authenticated users (filtered by organization for non-super-admin)
