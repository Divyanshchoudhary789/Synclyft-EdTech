# Shared / Cross-Role APIs

Base path: `/`, `/auth`, `/notifications`, `/analytics/activity`

---

## Root

### GET `/`
API info endpoint.
- **Response 200:** `{ "success": true, "message": "API endpoints available", "version": "1.0.0" }`

---

## Authentication (Cross-Role)

These endpoints are available to all users (public or authenticated):

### POST `/auth/signup/college-admin/send-otp`
Send OTP for college admin signup.
- **Rate Limited:** 30s cooldown
- **Request Body:**
```json
{
  "name": "string",
  "email": "string (official email, not personal)",
  "organization": "string",
  "role": "college-admin",
  "password": "string"
}
```
- **Response 200:** `{ "success": true, "message": "OTP sent Successfully" }`
- **Note:** Personal email domains (gmail, yahoo, outlook, hotmail, icloud, live) are blocked

### POST `/auth/signup/college-admin/verify-otp`
Verify OTP and create college admin account (status: Pending).
- **Request Body:**
```json
{
  "email": "string",
  "otp": "string (6 digits)"
}
```
- **Response 201:** `{ "success": true, "message": "OTP Verification successful! Your account is created and pending approval from the Super Admin." }`

### GET `/auth/user`
Get current authenticated user.
- **Response 200:** `{ "message": "User Fetched Successfully", "user": {...} }`

### POST `/auth/logout`
Clears the auth cookie.
- **Response 200:** `{ "message": "Logged Out Successfully" }`

---

## Notifications (Cross-Role)

All notification endpoints require authentication.

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

---

## Password Reset (Cross-Role)

These endpoints are available to all users regardless of role.

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

## Activity Timeline (Cross-Role)

### GET `/analytics/activity/student`
Get student activity timeline.
- **Role:** `student`
- **Query Params:** `page`, `limit`, `action`, `resourceType`, `from`, `to`
- **Response 200:** `{ "success": true, "data": { "timeline": [...] }, "pagination": {...} }`

### GET `/analytics/activity/college`
Get college admin activity timeline.
- **Role:** `college-admin`
- **Query Params:** `page`, `limit`, `action`, `resourceType`, `studentId`, `from`, `to`
- **Response 200:** `{ "success": true, "data": { "timeline": [...], "actionDistribution": [...] }, "pagination": {...} }`

### GET `/analytics/activity/super-admin`
Get super admin activity timeline.
- **Role:** `super-admin`
- **Query Params:** `page`, `limit`, `action`, `resourceType`, `userRole`, `userId`, `organizationId`, `from`, `to`
- **Response 200:** `{ "success": true, "data": { "timeline": [...], "actionDistribution": [...], "roleDistribution": [...], "hourlyActivity": [...] }, "pagination": {...} }`
