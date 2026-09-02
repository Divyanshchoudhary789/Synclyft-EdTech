# Payment Integration Guide

## Razorpay Integration

This platform uses Razorpay for payment processing. All payment-related logic is in the billing module.

---

## Payment Flow

### 1. Create Order / Initiate Payment
**Endpoint:** `POST /billing/initiate-payment`

**Request:**
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

**Response:**
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

**Frontend Action:**
- Use the `paymentLink` to redirect user to Razorpay checkout
- Or use `orderId` with Razorpay SDK to open checkout

---

### 2. Verify Payment
**Endpoint:** `POST /billing/verify-payment`

**Request:**
```json
{
  "razorpayOrderId": "string",
  "razorpayPaymentId": "string",
  "razorpaySignature": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "...",
    "status": "completed",
    "amount": 0
  }
}
```

**Frontend Action:**
- After payment completion, Razorpay returns `razorpay_payment_id` and `razorpay_order_id`
- Use Razorpay SDK to generate `razorpay_signature` on frontend
- Send all three to backend for verification

---

### 3. Retry Payment
**Endpoint:** `POST /billing/retry-payment`

**Request:**
```json
{
  "paymentLogId": "string",
  "billingId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "...",
    "paymentLink": "...",
    "retryAttempt": 1
  }
}
```

---

### 4. Process Refund
**Endpoint:** `POST /billing/refund`

**Roles:** `college-admin`, `super-admin`

**Request:**
```json
{
  "paymentId": "string",
  "billingId": "string",
  "amount": 0,
  "reason": "string (max 500)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "refundId": "...",
    "amount": 0,
    "status": "..."
  }
}
```

---

### 5. Webhook Handling
**Endpoint:** `POST /webhooks/razorpay-webhook`

- Razorpay sends webhooks for: `payment.captured`, `payment.authorized`, `payment.failed`, `refund.created`
- Signature verification uses `x-razorpay-signature` header
- On success: marks billing as paid, sends notification
- On failure: logs error, sends failure notification
- On refund: updates billing record

---

## Subscription Models

### Plans
| Plan | Description |
|------|-------------|
| `basic` | Entry-level plan |
| `pro` | Mid-tier plan |
| `enterprise` | Full-featured plan |

### Billing Cycles
- `monthly`
- `quarterly`
- `yearly`

### Seat Management
- Each plan has a maximum seat limit
- Seats are allocated/released by college admin
- Usage percentage is tracked in real-time
- Cannot downgrade if used seats exceed new plan capacity

---

## Invoice Management

### Create Invoice
**Endpoint:** `POST /billing/create-invoice`

**Roles:** `college-admin`, `super-admin`

**Request:**
```json
{
  "subscriptionId": "string",
  "subtotal": 0,
  "tax": 0,
  "discount": 0
}
```

**Response:** `201 Created`

### Download Invoice PDF
**Endpoint:** `GET /billing/invoices/:invoiceId/download-pdf`

**Response:** PDF file attachment

---

## Payment Status Flow

```
pending -> initiated -> captured -> completed
                |
                v
              failed -> retry -> captured -> completed
                |
                v
              refunded
```

---

## Environment Variables

```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

---

## Frontend Integration Checklist

- [ ] Install Razorpay SDK (`npm install razorpay` or CDN)
- [ ] Initialize Razorpay with `RAZORPAY_KEY_ID`
- [ ] Call `POST /billing/initiate-payment` to get `orderId` and `paymentLink`
- [ ] Open Razorpay checkout with order details
- [ ] On payment success, get `razorpay_payment_id` from Razorpay response
- [ ] Generate `razorpay_signature` using `RAZORPAY_KEY_SECRET` on frontend
- [ ] Call `POST /billing/verify-payment` with order ID, payment ID, and signature
- [ ] Handle webhook events for async payment confirmation
- [ ] Show payment success/failure UI based on response
