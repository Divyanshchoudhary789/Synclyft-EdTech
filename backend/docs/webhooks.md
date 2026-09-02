# Webhooks

Base path: `/webhooks`

> These endpoints are public and do not require authentication.

---

## Razorpay Webhook

### POST `/webhooks/razorpay-webhook`
Receive and process Razorpay webhook events.

**Headers:**
- `x-razorpay-signature`: Razorpay signature for verification

**Request Body:** Razorpay webhook payload

**Supported Events:**
- `payment.captured` / `payment.authorized`
- `payment.failed`
- `refund.created`

**Response 200:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Response 401:**
```json
{
  "success": false,
  "message": "Invalid signature"
}
```

**Response 500:**
```json
{
  "success": false,
  "message": "Error processing webhook"
}
```

---

## Webhook Behavior

### payment.captured / payment.authorized
- Updates `PaymentGatewayLog` status to `captured`
- Marks billing record as paid
- Sends payment success notification to college admin
- Logs payment verification

### payment.failed
- Updates `PaymentGatewayLog` with failure reason
- Sends payment failed notification to college admin
- Logs payment failure

### refund.created
- Updates billing record with refund amount and date
- Sets payment status to `refunded`
- Logs refund

---

## Frontend Integration Notes

1. Razorpay sends webhooks to this endpoint automatically when payment events occur
2. Signature verification is mandatory using `RAZORPAY_WEBHOOK_SECRET`
3. The endpoint always returns 200 to acknowledge receipt
4. Actual processing happens after signature validation
5. Errors are logged but do not block webhook acknowledgment
