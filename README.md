# EdTech Platform - Backend

> A comprehensive placement and learning management platform backend built with Express.js, MongoDB, and modern cloud services.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** MongoDB / Mongoose
- **Auth:** JWT, Passport.js (OAuth: Google, LinkedIn, GitHub)
- **Payments:** Razorpay
- **Storage:** Cloudflare R2 (S3-compatible)
- **AI:** Google Gemini
- **Code Execution:** Judge0
- **Real-time:** Socket.io
- **Email:** Nodemailer
- **Logging:** Winston

## Features

- Multi-role authentication (Student, College Admin, Super Admin)
- OTP-based login/signup with rate limiting
- OAuth integration (Google, LinkedIn, GitHub)
- Interview session management with AI-powered evaluation
- Coding round execution via Judge0
- Proctoring risk assessment and violation tracking
- Subscription and billing management
- Razorpay payment integration with webhooks
- Campaign and batch management for colleges
- AI-driven insights, study plans, and recommendations
- Performance reports (PDF/CSV)
- Notifications with preferences
- Audit logging and activity timelines
- File uploads to Cloudflare R2

## Project Structure

```
backend/
├── config/
├── controllers/
├── middlewares/
├── models/
├── routes/
├── services/
├── utils/
├── index.js
├── package.json
└── .env.example
```

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in the required values
4. Start MongoDB
5. Run the server:
   ```bash
   node index.js
   ```

## Environment Variables

Create a `.env` file in the `backend` directory with:

```
NODE_ENV=development
PORT=5000
MONGODB_URL=mongodb://localhost:27017/edtech
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

# Email
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=

# AI
GEMINI_API_KEY=

# Judge0
JUDGE0_API_KEY=
CODING_QUESTIONS_BATCH_URL=
CODING_QUESTIONS_BATCH_TOKEN=
TECHNICAL_QUESTION_URL=
TECHNICAL_QUESTION_TOKEN=

# Redis
REDIS_URL=
```

## API Documentation

See [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md) for full API reference.

## Scripts

```bash
npm start
```

## License

ISC
