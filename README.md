# HumaariShaadi Backend

Node.js + Express + MongoDB starter backend based on the 52-page HumaariShaadi app reference PDF.

## Run locally
1. Install Node.js 20+ and MongoDB.
2. `npm install`
3. Copy `.env.example` to `.env` and set `MONGODB_URI` and a strong `JWT_SECRET`.
4. `npm run dev`
5. Health check: `GET http://localhost:5000/health`
6. API base: `http://localhost:5000/api/v1`

## Authentication
Send `POST /auth/send-otp` with `{ "phone": "9876543210" }`.
For local testing, set `OTP_PROVIDER=mock`; response includes `developmentOtp`.
Verify with `POST /auth/verify-otp` and `{ "phone": "...", "otp": "..." }`.
Use returned token as `Authorization: Bearer <token>`.

## Frontend Integration Guides (Flutter)
- [Flutter Socket.IO Chat Integration Guide](docs/FLUTTER_CHAT_INTEGRATION.md)
- [Flutter Firebase Push Notifications Integration Guide](docs/FLUTTER_FIREBASE_NOTIFICATIONS.md)

## Main modules
- auth, master data, onboarding, profiles
- matches, likes, shortlist, views, contacts
- chats + Socket.IO
- PhonePe order placeholder, subscriptions
- biodata placeholder, support, account, WhatsApp consent

## Important production work still required
This is a runnable backend foundation, not a production-certified deployment. Before launch:
- Integrate an actual SMS OTP provider; never return OTP in production.
- Add request validation, audit logs, admin APIs, tests and API documentation.
- Implement Cloudinary upload routes and verify file MIME/type/size.
- Implement PhonePe checkout, callback and webhook signature verification. Never activate plans from client input.
- Implement PDF generation and secure signed download URLs.
- Add privacy/consent rules, profile visibility enforcement, block/report, moderation and account data-retention/anonymization.
- Add robust match scoring, age/height/salary range filters, pagination and indexes.
- Restrict chat membership, validate message text and add abuse/report/block controls.
- Add admin review workflows for verification, support tickets, master data and user moderation.
- Review health/profile fields as sensitive personal data and apply access controls/encryption/retention policies.

## Notes
Master lists are starter values based on the supplied UI screens. State, district, city and caste catalogs should be stored in database collections and populated from an approved dataset. All API responses use `{ success, message, data }` where applicable.
