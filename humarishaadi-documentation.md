# 💍 HumaariShaadi Matrimonial Platform - Complete API Documentation

> **Version:** 1.0.0  
> **Backend Framework:** Node.js · Express.js · MongoDB (Mongoose) · Socket.IO v4 · Cloudinary · Razorpay · Firebase Cloud Messaging (FCM)  
> **Default Port:** `6000` (Configurable via `PORT` in `.env`)  
> **Base API Route:** `/api/v1`  
> **Postman / Thunder Client Collection File:** `humarishaadi-collection.json` (located in root directory)

---

## 📑 Table of Contents
1. [Architecture & System Overview](#1-architecture--system-overview)
2. [Base URLs & Network Configuration (Flutter Guide)](#2-base-urls--network-configuration-flutter-guide)
3. [Authentication & Common Conventions](#3-authentication--common-conventions)
4. [Master API Reference (All Modules & Endpoints)](#4-master-api-reference)
   - [4.0 Server Health](#40-server-health)
   - [4.1 Authentication APIs (`/auth`)](#41-authentication-apis-auth)
   - [4.2 Master Data APIs (`/master`)](#42-master-data-apis-master)
   - [4.3 Onboarding APIs (`/onboarding`)](#43-onboarding-apis-onboarding)
   - [4.4 Profile Management APIs (`/profiles`)](#44-profile-management-apis-profiles)
   - [4.5 Photos & Documents Upload (Cloudinary)](#45-photos--documents-upload-cloudinary)
   - [4.6 Matchmaking & Search APIs (`/matches`)](#46-matchmaking--search-apis-matches)
   - [4.7 Interactions APIs (`/interactions`)](#47-interactions-apis-interactions)
   - [4.8 Chat & Conversation APIs (`/chats`)](#48-chat--conversation-apis-chats)
   - [4.9 Real-Time Socket.IO Chat Specification](#49-real-time-socketio-chat-specification)
   - [4.10 Payments & Razorpay APIs (`/payments`)](#410-payments--razorpay-apis-payments)
   - [4.11 Subscriptions APIs (`/subscriptions`)](#411-subscriptions-apis-subscriptions)
   - [4.12 Biodata APIs (`/biodata`)](#412-biodata-apis-biodata)
   - [4.13 Support & Helpdesk APIs (`/support`)](#413-support--helpdesk-apis-support)
   - [4.14 Account Settings & Privacy (`/account`)](#414-account-settings--privacy-account)
   - [4.15 Push Notifications & WhatsApp (`/notifications`)](#415-push-notifications--whatsapp-notifications)
5. [Complete Flutter Integration Blueprint (Copy-Paste Ready)](#5-complete-flutter-integration-blueprint)
   - [5.1 Recommended Flutter Dependencies (`pubspec.yaml`)](#51-recommended-flutter-dependencies-pubspecyaml)
   - [5.2 Base API Client with Dio & Token Interceptor](#52-base-api-client-with-dio--token-interceptor)
   - [5.3 Dart Data Models](#53-dart-data-models)
   - [5.4 Flutter Socket.IO Chat Service](#54-flutter-socketio-chat-service)
   - [5.5 Flutter Cloudinary Media Upload Service](#55-flutter-cloudinary-media-upload-service)
   - [5.6 Flutter Razorpay Checkout Service](#56-flutter-razorpay-checkout-service)
   - [5.7 Flutter Firebase Push Notification Service](#57-flutter-firebase-push-notification-service)
6. [Error Handling & HTTP Status Codes](#6-error-handling--http-status-codes)

---

## 1. Architecture & System Overview

HumaariShaadi backend is a production-ready matrimonial microservice API designed to power iOS, Android, and Web clients.

```
                           +--------------------------------------+
                           |        FLUTTER MOBILE CLIENT         |
                           +--------------------------------------+
                                      |            |          ^
                     REST Calls (HTTPS/Dio)   Socket.IO   FCM Push
                                      v            v          |
+----------------------------------------------------------------------------------+
|                              HUMAARISHAADI BACKEND                               |
|                                (Node.js & Express)                               |
+----------------------------------------------------------------------------------+
   |                  |                      |                     |              |
   v                  v                      v                     v              v
[MongoDB]        [Cloudinary]            [Razorpay]           [Firebase Admin]  [Socket.IO]
 Database     Profile Photos & IDs     Payment Orders & Webhook  Push Alerts   Live Messaging
```

### Integrated Core Services:
- **Database:** MongoDB via Mongoose with indexed schemas for Users, Profiles, Interactions, Chats, Messages, Subscriptions, and OTPs.
- **Media CDN:** Cloudinary direct buffer upload for Single & Bulk photos, DP selection, and ID verification PDFs/Images.
- **Payment Gateway:** Razorpay Orders, HMAC SHA-256 signature verification, and automated subscription activation.
- **Real-Time Communication:** Socket.IO v4 room-based messaging, typing indicators, and read receipts.
- **Push Notifications:** Google Firebase Cloud Messaging (FCM) multicast alerts on background, foreground, and lock-screen.

---

## 2. Base URLs & Network Configuration (Flutter Guide)

Depending on your Flutter test environment, use the corresponding base URL:

| Environment | Base URL | Notes |
|:---|:---|:---|
| **Active Ngrok Tunnel** | `https://bouncy-ember-enlisted.ngrok-free.dev` | **Recommended**: HTTPS tunnel for physical phones, emulators, web, and remote testing without network restrictions. |
| **Android Emulator** | `http://10.0.2.2:6000` | Android maps `10.0.2.2` to the host machine's `localhost`. |
| **iOS Simulator** | `http://localhost:6000` | iOS simulator shares localhost with your Mac. |
| **Physical Phone (Wi-Fi)** | `http://192.168.x.x:6000` | Use your computer's local Wi-Fi IPv4 address. |
| **Production Server** | `https://api.humaarishaadi.com` | Production domain with SSL/TLS certificate. |

### ⚠️ Android Cleartext Traffic (Required for HTTP testing)
When testing with `http://10.0.2.2:6000` or local IP, Android blocks unencrypted HTTP traffic by default. Enable cleartext traffic in your Flutter project's `android/app/src/main/AndroidManifest.xml`:

```xml
<application
    android:usesCleartextTraffic="true"
    android:label="HumaariShaadi"
    android:icon="@mipmap/ic_launcher">
    ...
</application>
```

---

## 3. Authentication & Common Conventions

### Standard Headers
All protected API endpoints require the JWT token in the Authorization header:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```
For file uploads, use `multipart/form-data`.

### Standard Response Envelope
Successful responses follow this uniform structure:
```json
{
  "success": true,
  "message": "Optional descriptive status message",
  "data": { ... }
}
```

### Standard Error Envelope
Failed responses return:
```json
{
  "success": false,
  "message": "Error description"
}
```

### Mock OTP Mode in Development
When `OTP_PROVIDER=mock` in `.env`, `/api/v1/auth/send-otp` returns `developmentOtp` directly in the API response data for easy automated and manual testing without an SMS gateway.

---

## 4. Master API Reference

### 4.0 Server Health

#### `GET /health`
- **Auth:** No
- **Description:** Verifies that the server process is alive and responsive.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "HumaariShaadi API is running"
}
```

---

### 4.1 Authentication APIs (`/auth`)

#### 1. Send OTP
- **Endpoint:** `POST /api/v1/auth/send-otp`
- **Auth:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "9876543210"
}
```
- **Validation:** 10 to 15 digit numeric string.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "OTP generated",
  "data": {
    "phone": "9876543210",
    "expiresInMinutes": 5,
    "developmentOtp": "491820"
  }
}
```
*(Note: `developmentOtp` is included only when `OTP_PROVIDER=mock`)*

#### 2. Verify OTP & Login
- **Endpoint:** `POST /api/v1/auth/verify-otp`
- **Auth:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "491820"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "660e53a29b47e24a1b8e4f11",
      "phone": "9876543210",
      "role": "user",
      "status": "active",
      "language": "hi",
      "onboardingCompleted": false,
      "whatsappConsent": false,
      "fcmTokens": [],
      "privacy": {
        "showPhone": false,
        "profileVisibility": "members"
      },
      "createdAt": "2026-03-31T09:12:02.000Z",
      "updatedAt": "2026-03-31T09:12:02.000Z"
    }
  }
}
```

#### 3. Resend OTP
- **Endpoint:** `POST /api/v1/auth/resend-otp`
- **Auth:** No
- **Response `501 Not Implemented`:** Call `/api/v1/auth/send-otp` to request a new code.

#### 4. Get Current User (`/auth/me`)
- **Endpoint:** `GET /api/v1/auth/me`
- **Auth:** Yes (`Bearer <token>`)
- **Response `200 OK`:** Returns current logged-in `User` document.

#### 5. Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Auth:** Yes (`Bearer <token>`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Logged out. Remove the JWT on client.",
  "data": null
}
```

---

### 4.2 Master Data APIs (`/master`)

Public catalogs used for drop-downs and onboarding forms.

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/v1/master` | Returns list of master data keys: `["languages","religions","motherTongues","occupations","education","diets","maritalStatuses","salaryRanges"]` |
| `GET` | `/api/v1/master/religions` | `["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Parsi", "Buddhist"]` |
| `GET` | `/api/v1/master/languages` | `["Hindi", "English", "Marathi", "Gujarati", "Bengali", "Kannada", "Tamil", "Malayalam", "Punjabi", "Urdu", "Telugu", "Odia"]` |
| `GET` | `/api/v1/master/motherTongues` | Supported mother tongues (Hindi, Marathi, Punjabi, Awadhi, Bhojpuri, Marwari, etc.) |
| `GET` | `/api/v1/master/occupations` | `["Not applicable", "Private Company", "Government / Defense", "Business", "Student"]` |
| `GET` | `/api/v1/master/education` | `["10th standard", "12th standard", "Diploma", "Bachelor degree", "Master degree", "PhD"]` |
| `GET` | `/api/v1/master/diets` | `["Vegetarian", "Non-Vegetarian", "Eggetarian"]` |
| `GET` | `/api/v1/master/maritalStatuses` | `["Unmarried", "Divorced / Getting Divorced", "Widow", "Widower"]` |
| `GET` | `/api/v1/master/salaryRanges` | `["₹0", "₹0 - ₹15,000", "₹15,000 - ₹30,000", "₹30,000 - ₹50,000", "₹50,000 - ₹75,000", "₹75,000 - ₹1,00,000", "₹1,00,000 - ₹1,50,000", "₹1,50,000 - ₹2,00,000", "₹2,00,000 - ₹5,00,000", "₹5,00,000+"]` |

---

### 4.3 Onboarding APIs (`/onboarding`)

#### 1. Get Onboarding Status
- **Endpoint:** `GET /api/v1/onboarding/status`
- **Auth:** Yes
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "completed": false,
    "profileExists": true,
    "completion": 45
  }
}
```

#### 2. Complete Onboarding Profile
- **Endpoint:** `POST /api/v1/onboarding/complete`
- **Auth:** Yes
- **Request Body:**
```json
{
  "profileFor": "Self",
  "gender": "male",
  "name": "Rahul Sharma",
  "dob": "1998-07-15",
  "religion": "Hindu",
  "caste": "Brahmin",
  "motherTongue": ["Hindi"],
  "city": {
    "name": "Lucknow",
    "state": "Uttar Pradesh",
    "stateCode": "UP",
    "districtCode": "LKO"
  },
  "height": "5 ft 10 in",
  "diet": "Vegetarian",
  "maritalStatus": "Unmarried",
  "occupation": "Private Company",
  "salaryRange": "₹50,000 - ₹75,000",
  "education": "Bachelor degree"
}
```
- **Backend Effect:** Creates or updates `Profile`, creates initial default `Preference`, and sets `User.onboardingCompleted = true`.
- **Response `200 OK`:** Returns saved `Profile` object with `"Onboarding saved"`.

---

### 4.4 Profile Management APIs (`/profiles`)

#### 1. Get Own Profile
- **Endpoint:** `GET /api/v1/profiles/me`
- **Auth:** Yes
- **Response `200 OK`:** Full profile document of the authenticated user.

#### 2. Create or Full Replace Profile
- **Endpoint:** `POST /api/v1/profiles`
- **Auth:** Yes
- **Request Body:** Full profile object.
- **Response `201 Created`:** Saved profile.

#### 3. Update Personal Details
- **Endpoint:** `PATCH /api/v1/profiles/personal`
- **Auth:** Yes
- **Request Body:**
```json
{
  "name": "Rahul Sharma",
  "dob": "1998-07-15",
  "gender": "male",
  "religion": "Hindu",
  "caste": "Brahmin",
  "otherCastes": true,
  "gotra": "Bharadwaj",
  "motherTongue": ["Hindi", "English"],
  "city": {
    "name": "Lucknow",
    "state": "Uttar Pradesh"
  },
  "height": "5 ft 10 in",
  "diet": "Vegetarian",
  "maritalStatus": "Unmarried"
}
```

#### 4. Update Professional Details
- **Endpoint:** `PATCH /api/v1/profiles/professional`
- **Auth:** Yes
- **Request Body:**
```json
{
  "occupation": "Private Company",
  "salaryRange": "₹75,000 - ₹1,00,000",
  "companyName": "Infosys Technologies",
  "companyLocation": "Noida",
  "education": "Bachelor degree"
}
```

#### 5. Update Family Details
- **Endpoint:** `PATCH /api/v1/profiles/family`
- **Auth:** Yes
- **Request Body:**
```json
{
  "family": {
    "fatherStatus": "Employed (Retired Govt Officer)",
    "motherStatus": "Homemaker",
    "place": "Lucknow",
    "monthlySalary": "₹60,000",
    "property": ["Own Independent House in Lucknow", "Agricultural Land"],
    "type": "Nuclear",
    "siblings": "1 Brother (Married), 1 Sister"
  }
}
```

#### 6. Update Astrology Details
- **Endpoint:** `PATCH /api/v1/profiles/astrology`
- **Auth:** Yes
- **Request Body:**
```json
{
  "astrology": {
    "mangalDosha": "No",
    "birthPlace": "Varanasi",
    "birthTime": "08:45 AM"
  }
}
```

#### 7. Update Health Details
- **Endpoint:** `PATCH /api/v1/profiles/health`
- **Auth:** Yes
- **Request Body:**
```json
{
  "health": {
    "alcohol": "No",
    "smoking": "No",
    "issues": [],
    "disability": "No"
  }
}
```

#### 8. Update About Me Bio
- **Endpoint:** `PATCH /api/v1/profiles/about`
- **Auth:** Yes
- **Request Body:**
```json
{
  "about": "Namaste! I am an easy-going, career-focused individual who values Indian traditions alongside modern perspectives."
}
```

#### 9. Update Partner Preferences
- **Endpoint:** `PATCH /api/v1/profiles/preferences`
- **Auth:** Yes
- **Request Body:**
```json
{
  "ageMin": 22,
  "ageMax": 28,
  "allowOtherCastes": true,
  "locations": ["Lucknow", "Noida", "Delhi", "Kanpur"],
  "maritalStatuses": ["Unmarried"],
  "motherTongues": ["Hindi", "English"],
  "salaryMin": 300000,
  "salaryMax": 1500000,
  "occupations": ["Private Company", "Government / Defense", "Business"],
  "educationLevels": ["Bachelor degree", "Master degree"],
  "heightMin": "5 ft 2 in",
  "heightMax": "5 ft 8 in",
  "diets": ["Vegetarian", "Eggetarian"],
  "mangalDosha": ["No", "Don't Know"]
}
```

#### 10. Get ID Verification Status
- **Endpoint:** `GET /api/v1/profiles/verification/status`
- **Auth:** Yes
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "status": "pending",
    "documentUrl": "https://res.cloudinary.com/mguysky1/image/upload/...",
    "remarks": ""
  }
}
```

#### 11. Submit Document URL (Manual fallback)
- **Endpoint:** `PATCH /api/v1/profiles/verification`
- **Auth:** Yes
- **Request Body:** `{ "documentUrl": "https://..." }`

#### 12. Get Profile by ID
- **Endpoint:** `GET /api/v1/profiles/:profileId`
- **Auth:** Yes
- **Response `200 OK`:** Candidate's profile with populated user metadata.

---

### 4.5 Photos & Documents Upload (Cloudinary)

Cloudinary integration handles photo uploads, bulk uploads, primary display picture (DP) toggling, deletion, and Govt ID document storage.

| Feature | Method | Endpoint | Content-Type | Form Field | Constraints |
|:---|:---:|:---|:---|:---:|:---|
| **Upload Single Photo** | `POST` | `/api/v1/profiles/photos` | `multipart/form-data` | `photo` | JPG/PNG/WEBP (Max 5MB) |
| **Upload Multiple Photos** | `POST` | `/api/v1/profiles/photos/bulk` | `multipart/form-data` | `photos` | Up to 5 files at once |
| **Set Primary Photo (DP)** | `PATCH` | `/api/v1/profiles/photos/:photoId/primary` | None | None | `:photoId` in URL |
| **Delete Photo** | `DELETE` | `/api/v1/profiles/photos/:photoId` | None | None | Automatically purges from Cloudinary |
| **Upload ID Verification** | `POST` | `/api/v1/profiles/verification/upload` | `multipart/form-data` | `document` | JPG/PNG/PDF (Max 10MB) |

#### Photo Response Object Format:
```json
{
  "success": true,
  "message": "Photo uploaded successfully",
  "data": [
    {
      "_id": "67cb1a48c909e3...",
      "url": "https://res.cloudinary.com/mguysky1/image/upload/v1741347400/humarishaadi/profiles/photo_123.jpg",
      "publicId": "humarishaadi/profiles/photo_123",
      "isPrimary": true
    }
  ]
}
```

---

### 4.6 Matchmaking & Search APIs (`/matches`)

#### 1. Get Recommended Matches Feed
- **Endpoint:** `GET /api/v1/matches`
- **Auth:** Yes
- **Query Parameters:**
  - `gender` *(optional)*: `"male"` or `"female"`. (Defaults to opposite of user's profile).
  - `city` *(optional)*: City filter (e.g., `Lucknow`).
  - `state` *(optional)*: State filter (e.g., `Uttar Pradesh`).
  - `page` *(optional)*: Page number (Default `1`).
  - `limit` *(optional)*: Items per page (Default `20`, Max `50`).
- **Response `200 OK`:** Array of matching `Profile` objects (Verification details stripped for privacy).

#### 2. Advanced Multi-Criteria Match Search
- **Endpoint:** `POST /api/v1/matches/search`
- **Auth:** Yes
- **Request Body:**
```json
{
  "gender": "female",
  "religion": "Hindu",
  "caste": "Brahmin",
  "city": "Lucknow",
  "state": "Uttar Pradesh",
  "maritalStatus": "Unmarried",
  "education": "Bachelor degree",
  "occupation": "Private Company",
  "ageMin": 21,
  "ageMax": 29,
  "heightMin": 150,
  "heightMax": 175,
  "page": 1,
  "limit": 20
}
```
- **Response `200 OK`:** Filtered profiles matching criteria with height parsing (supports both cm and ft/in).

#### 3. Refresh Match Recommendations
- **Endpoint:** `POST /api/v1/matches/refresh`
- **Auth:** Yes
- **Response `200 OK`:** `{ "success": true, "data": { "refreshedAt": "2026-11-03T10:15:00.000Z" } }`

#### 4. Get Match Details
- **Endpoint:** `GET /api/v1/matches/:profileId`
- **Auth:** Yes
- **Response `200 OK`:** Single profile details.

---

### 4.7 Interactions APIs (`/interactions`)

Interactions power the core matrimonial interest lifecycle and automatically trigger Firebase FCM push notifications to the recipient.

| Action | Method | Endpoint | Auth | Notification Dispatched |
|:---|:---:|:---|:---:|:---|
| **Like Profile (Send Interest)** | `POST` | `/api/v1/interactions/like/:profileId` | Yes | `"New Interest Received 💕"` |
| **Remove Like** | `DELETE` | `/api/v1/interactions/like/:profileId` | Yes | - |
| **Get Sent Likes** | `GET` | `/api/v1/interactions/sent-likes` | Yes | - |
| **Get Received Likes** | `GET` | `/api/v1/interactions/received-likes` | Yes | - |
| **Shortlist Profile** | `POST` | `/api/v1/interactions/shortlist/:profileId` | Yes | `"Profile Shortlisted ⭐"` |
| **Remove from Shortlist** | `DELETE` | `/api/v1/interactions/shortlist/:profileId` | Yes | - |
| **Get Shortlisted Profiles** | `GET` | `/api/v1/interactions/shortlist` | Yes | - |
| **Request Contact** | `POST` | `/api/v1/interactions/contact/:profileId` | Yes | `"Contact Request Received 📱"` |
| **Remove Contact Request** | `DELETE` | `/api/v1/interactions/contact/:profileId` | Yes | - |
| **Get Contacted Profiles** | `GET` | `/api/v1/interactions/contacts` | Yes | - |
| **Get Profile Views** | `GET` | `/api/v1/interactions/views` | Yes | - |
| **Get Mutual Matches (Likes)** | `GET` | `/api/v1/interactions/matches` | Yes | - |

---

### 4.8 Chat & Conversation APIs (`/chats`)

Used for REST message loading and fallback sending when WebSocket is temporarily unavailable.

#### 1. Start or Get Conversation
- **Endpoint:** `POST /api/v1/chats`
- **Auth:** Yes
- **Request Body:** `{ "userId": "<OTHER_USER_ID>" }`
- **Response `201 Created`:** Chat conversation object.

#### 2. List Conversations (Inbox)
- **Endpoint:** `GET /api/v1/chats`
- **Auth:** Yes
- **Response `200 OK`:** List of conversations with populated participants and `lastMessage`.

#### 3. Get Conversation Messages
- **Endpoint:** `GET /api/v1/chats/:chatId/messages`
- **Auth:** Yes
- **Response `200 OK`:** Up to 200 messages in conversation sorted chronologically.

#### 4. Send Message (REST Fallback)
- **Endpoint:** `POST /api/v1/chats/:chatId/messages`
- **Auth:** Yes
- **Request Body:** `{ "text": "Hello, how are you?" }`
- **Backend Effect:** Saves message, updates `lastMessage`, broadcasts via Socket.IO to room `chat:<chatId>` and `user:<recipientId>`, and sends FCM Push Notification.
- **Response `201 Created`:** Populated message object.

#### 5. Mark Messages as Read
- **Endpoint:** `PATCH /api/v1/chats/:chatId/read`
- **Auth:** Yes
- **Response `200 OK`:** Messages marked read in DB and `chat:read` emitted via Socket.IO.

#### 6. Delete Conversation
- **Endpoint:** `DELETE /api/v1/chats/:chatId`
- **Auth:** Yes

---

### 4.9 Real-Time Socket.IO Chat Specification

Connect to server with Socket.IO Client v4 using WebSocket transport and authentication payload:

```javascript
// Connection handshake
const socket = io("http://localhost:6000", {
  transports: ["websocket"],
  auth: { token: "Bearer " + jwtToken }
});
```

#### Socket Events Specification:

| Event Name | Direction | Payload | Description |
|:---|:---:|:---|:---|
| **`chat:join`** | Client ➔ Server | `{ "chatId": "..." }` | Joins the chat room (verifies membership). Callback returns `{ success: true }`. |
| **`chat:leave`** | Client ➔ Server | `{ "chatId": "..." }` | Leaves chat room on screen exit. |
| **`chat:message`** | Client ➔ Server | `{ "chatId": "...", "text": "Hi" }` | Emits message with optional acknowledgement. Saves to DB, broadcasts to room. |
| **`chat:message`** | Server ➔ Client | Full populated `Message` JSON | Received by room participants in real-time. |
| **`chat:typing`** | Client ➔ Server | `{ "chatId": "...", "isTyping": true }` | Broadcasts user typing status. |
| **`chat:typing`** | Server ➔ Client | `{ "userId": "...", "isTyping": true }` | Displays "typing..." in opponent's app. |
| **`chat:read`** | Client ➔ Server | `{ "chatId": "..." }` | Marks messages read in DB and notifies sender. |
| **`chat:read`** | Server ➔ Client | `{ "chatId": "...", "readBy": "..." }` | Receiver turns double checkmarks blue (read receipts). |

---

### 4.10 Payments & Razorpay APIs (`/payments`)

Production payment flow using Razorpay Gateway with sandbox fallback.

#### Payment Lifecycle Diagram:
```
[Flutter App]                          [HumaariShaadi Backend]            [Razorpay Gateway]
      |                                           |                                |
      | 1. POST /payments/create-order           |                                |
      |------------------------------------------>|                                |
      |                                           | 2. rzp.orders.create(...)     |
      |                                           |------------------------------->|
      |                                           |<-------------------------------|
      |                                           | (Returns order_id)             |
      |<------------------------------------------|                                |
      | (Receives orderId & amountInPaise)        |                                |
      |                                           |                                |
      | 3. Opens Razorpay Native Checkout Dialog |                                |
      |--------------------------------------------------------------------------->|
      |                                           |                                |
      | 4. User completes UPI / Card payment      |                                |
      |<---------------------------------------------------------------------------|
      | (Receives payment_id & signature)         |                                |
      |                                           |                                |
      | 5. POST /payments/verify                  |                                |
      |------------------------------------------>|                                |
      |                                           | 6. Verifies HMAC SHA-256 Sign  |
      |                                           | 7. Activates Subscription      |
      |<------------------------------------------|                                |
      | 200 OK (Subscription is Active!)          |                                |
```

#### 1. Create Order
- **Endpoint:** `POST /api/v1/payments/create-order`
- **Auth:** Yes
- **Request Body:**
```json
{
  "planId": "monthly",
  "amount": 299
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "message": "Order created",
  "data": {
    "subscriptionId": "67cb1f80...",
    "orderId": "order_Q12345678",
    "amount": 299,
    "amountInPaise": 29900,
    "currency": "INR",
    "keyId": "rzp_test_YourKeyHere",
    "providerConfigured": true,
    "provider": "razorpay"
  }
}
```

#### 2. Verify Payment & Activate Subscription
- **Endpoint:** `POST /api/v1/payments/verify`
- **Auth:** Yes
- **Request Body:**
```json
{
  "orderId": "order_Q12345678",
  "razorpay_order_id": "order_Q12345678",
  "razorpay_payment_id": "pay_Q87654321",
  "razorpay_signature": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Payment verified and subscription activated",
  "data": {
    "_id": "67cb1f80...",
    "user": "660e53a29b47e24a1b8e4f11",
    "planId": "monthly",
    "amount": 299,
    "status": "active",
    "provider": "razorpay",
    "providerOrderId": "order_Q12345678",
    "providerPaymentId": "pay_Q87654321",
    "startAt": "2026-11-03T10:00:00.000Z",
    "endAt": "2026-12-03T10:00:00.000Z"
  }
}
```

#### 3. Payment Status Check
- **Endpoint:** `GET /api/v1/payments/status/:orderId`
- **Auth:** Yes
- **Response `200 OK`:** Returns current status (`pending`, `active`, `failed`).

#### 4. Webhook Receiver
- **Endpoint:** `POST /api/v1/payments/webhook`
- **Auth:** No (Validates `x-razorpay-signature` header HMAC).
- **Events Handled:** `payment.captured`, `order.paid`.

---

### 4.11 Subscriptions APIs (`/subscriptions`)

#### 1. Get Subscription Plans Catalog
- **Endpoint:** `GET /api/v1/subscriptions/plans`
- **Auth:** No
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    { "id": "trial", "name": "Trial", "amount": 1, "currency": "INR", "durationDays": 1 },
    { "id": "monthly", "name": "Monthly", "amount": 299, "currency": "INR", "durationDays": 30 },
    { "id": "quarterly", "name": "Quarterly", "amount": 799, "currency": "INR", "durationDays": 90 },
    { "id": "yearly", "name": "Yearly", "amount": 1999, "currency": "INR", "durationDays": 365 }
  ]
}
```

#### 2. Get Current Active Subscription
- **Endpoint:** `GET /api/v1/subscriptions/current`
- **Auth:** Yes
- **Response `200 OK`:** Active subscription with end date or `null` if expired.

#### 3. Activate Subscription (Sandbox / Test Mode)
- **Endpoint:** `POST /api/v1/subscriptions/activate`
- **Auth:** Yes
- **Request Body:** `{ "orderId": "<ORDER_ID>" }`

#### 4. Cancel Subscription
- **Endpoint:** `POST /api/v1/subscriptions/cancel`
- **Auth:** Yes

---

### 4.12 Biodata APIs (`/biodata`)

#### 1. Get My Biodata
- **Endpoint:** `GET /api/v1/biodata/me`
- **Auth:** Yes
- **Response `200 OK`:** Authenticated user's profile packaged for biodata rendering.

#### 2. Get Candidate Biodata
- **Endpoint:** `GET /api/v1/biodata/:profileId`
- **Auth:** Yes
- **Response `200 OK`:** Candidate's biodata (sanitized).

#### 3. Download Biodata PDF
- **Endpoint:** `POST /api/v1/biodata/download`
- **Auth:** No
- **Response `501 Not Implemented`:** Reserved for PDF generator service.

---

### 4.13 Support & Helpdesk APIs (`/support`)

#### 1. Get FAQs
- **Endpoint:** `GET /api/v1/support/faqs`
- **Auth:** No
- **Response `200 OK`:** Array of categorized FAQ questions and answers.

#### 2. Create Support Ticket
- **Endpoint:** `POST /api/v1/support/tickets`
- **Auth:** Yes
- **Request Body:**
```json
{
  "subject": "Photo upload problem",
  "category": "Profile",
  "message": "My photo upload gets stuck on slow mobile network. Kindly assist."
}
```
- **Response `201 Created`:** Created ticket document with `status: "open"`.

#### 3. Get User Tickets
- **Endpoint:** `GET /api/v1/support/tickets`
- **Auth:** Yes
- **Response `200 OK`:** List of user's submitted tickets with admin reply.

---

### 4.14 Account Settings & Privacy (`/account`)

#### 1. Get Account Settings
- **Endpoint:** `GET /api/v1/account/settings`
- **Auth:** Yes
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "phone": "9876543210",
    "language": "hi",
    "privacy": {
      "showPhone": false,
      "profileVisibility": "members"
    },
    "status": "active"
  }
}
```

#### 2. Update Privacy Settings
- **Endpoint:** `PATCH /api/v1/account/privacy`
- **Auth:** Yes
- **Request Body:**
```json
{
  "showPhone": false,
  "profileVisibility": "members"
}
```
*(Options for `profileVisibility`: `"public"`, `"members"`, `"hidden"`)*

#### 3. Update App Language
- **Endpoint:** `PATCH /api/v1/account/language`
- **Auth:** Yes
- **Request Body:** `{ "language": "hi" }`

#### 4. Deactivate / Delete Account
- **Endpoint:** `DELETE /api/v1/account/delete`
- **Auth:** Yes
- **Backend Effect:** Sets `User.status = "deleted"` and removes the `Profile` record.

---

### 4.15 Push Notifications & WhatsApp (`/notifications`)

Powered by Google Firebase Admin SDK project `humarishaadi-1488e`.

#### 1. Update WhatsApp Consent
- **Endpoint:** `PATCH /api/v1/notifications/whatsapp-consent`
- **Auth:** Yes
- **Request Body:** `{ "consent": true }`

#### 2. Register FCM Device Token
- **Endpoint:** `POST /api/v1/notifications/device-token`
- **Auth:** Yes
- **Request Body:**
```json
{
  "token": "dXYZ_fcm_device_token_from_mobile_device"
}
```
- **Backend Effect:** Adds token to `User.fcmTokens` array avoiding duplicates.

#### 3. Unregister FCM Device Token (On Logout)
- **Endpoint:** `DELETE /api/v1/notifications/device-token`
- **Auth:** Yes
- **Request Body:** `{ "token": "dXYZ_fcm_device_token..." }` (If omitted, removes all tokens for this user).

#### 4. Send Test Push Notification
- **Endpoint:** `POST /api/v1/notifications/send-test`
- **Auth:** Yes
- **Request Body:**
```json
{
  "title": "HumaariShaadi Test Alert 🔔",
  "body": "Push notification is working smoothly!"
}
```

---

## 5. Complete Flutter Integration Blueprint

### 5.1 Recommended Flutter Dependencies (`pubspec.yaml`)

Add these packages to your Flutter app:

```yaml
dependencies:
  flutter:
    sdk: flutter

  # Networking & HTTP
  dio: ^5.7.0

  # Real-time WebSocket Chat
  socket_io_client: ^3.0.2

  # Media Picking (Camera/Gallery & Documents)
  image_picker: ^1.1.2
  file_picker: ^8.1.4

  # Firebase Push Notifications
  firebase_core: ^3.6.0
  firebase_messaging: ^15.1.3
  flutter_local_notifications: ^17.2.3

  # Razorpay Payment Gateway
  razorpay_flutter: ^1.3.7

  # Secure Local Storage (for JWT Token)
  flutter_secure_storage: ^9.2.2
  intl: ^0.19.0
```

---

### 5.2 Base API Client with Dio & Token Interceptor

Create `lib/core/api_client.dart`:

```dart
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  static const _storage = FlutterSecureStorage();
  late final Dio dio;

  // Set appropriate URL based on device or use ngrok tunnel
  static String get baseUrl {
    // Active ngrok tunnel (recommended for testing on physical phone or emulator):
    return 'https://bouncy-ember-enlisted.ngrok-free.dev/api/v1';
    
    // Or for local offline development:
    // if (Platform.isAndroid) return 'http://10.0.2.2:6000/api/v1';
    // return 'http://localhost:6000/api/v1';
  }

  void init() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'jwt_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) {
          if (e.response?.statusCode == 401) {
            // Token expired or invalid -> Navigate user to Login Screen
          }
          return handler.next(e);
        },
      ),
    );
  }

  static Future<void> saveToken(String token) async {
    await _storage.write(key: 'jwt_token', value: token);
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  static Future<void> clearToken() async {
    await _storage.delete(key: 'jwt_token');
  }
}
```

---

### 5.3 Dart Data Models

#### 1. User Model (`lib/models/user_model.dart`)
```dart
class UserModel {
  final String id;
  final String phone;
  final String role;
  final String status;
  final String language;
  final bool onboardingCompleted;
  final bool whatsappConsent;
  final bool showPhone;
  final String profileVisibility;

  UserModel({
    required this.id,
    required this.phone,
    required this.role,
    required this.status,
    required this.language,
    required this.onboardingCompleted,
    required this.whatsappConsent,
    required this.showPhone,
    required this.profileVisibility,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final privacy = json['privacy'] as Map<String, dynamic>? ?? {};
    return UserModel(
      id: json['_id'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? 'user',
      status: json['status'] ?? 'active',
      language: json['language'] ?? 'hi',
      onboardingCompleted: json['onboardingCompleted'] ?? false,
      whatsappConsent: json['whatsappConsent'] ?? false,
      showPhone: privacy['showPhone'] ?? false,
      profileVisibility: privacy['profileVisibility'] ?? 'members',
    );
  }
}
```

#### 2. Profile Photo Model (`lib/models/profile_photo.dart`)
```dart
class ProfilePhoto {
  final String id;
  final String url;
  final String publicId;
  final bool isPrimary;

  ProfilePhoto({
    required this.id,
    required this.url,
    required this.publicId,
    required this.isPrimary,
  });

  factory ProfilePhoto.fromJson(Map<String, dynamic> json) {
    return ProfilePhoto(
      id: json['_id']?.toString() ?? '',
      url: json['url'] ?? '',
      publicId: json['publicId'] ?? '',
      isPrimary: json['isPrimary'] ?? false,
    );
  }
}
```

#### 3. Chat Message Model (`lib/models/chat_message.dart`)
```dart
class ChatMessage {
  final String id;
  final String chatId;
  final String senderId;
  final String senderPhone;
  final String text;
  final List<String> readBy;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.chatId,
    required this.senderId,
    required this.senderPhone,
    required this.text,
    required this.readBy,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final sender = json['sender'];
    String sId = '';
    String sPhone = '';

    if (sender is Map<String, dynamic>) {
      sId = sender['_id']?.toString() ?? '';
      sPhone = sender['phone']?.toString() ?? '';
    } else if (sender is String) {
      sId = sender;
    }

    return ChatMessage(
      id: json['_id']?.toString() ?? '',
      chatId: json['chat']?.toString() ?? '',
      senderId: sId,
      senderPhone: sPhone,
      text: json['text']?.toString() ?? '',
      readBy: (json['readBy'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
```

---

### 5.4 Flutter Socket.IO Chat Service

Create `lib/services/chat_socket_service.dart`:

```dart
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../models/chat_message.dart';

class ChatSocketService {
  static final ChatSocketService _instance = ChatSocketService._internal();
  factory ChatSocketService() => _instance;
  ChatSocketService._internal();

  IO.Socket? _socket;
  bool get isConnected => _socket?.connected ?? false;

  final _messageController = StreamController<ChatMessage>.broadcast();
  final _typingController = StreamController<Map<String, dynamic>>.broadcast();
  final _readController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<ChatMessage> get onMessageReceived => _messageController.stream;
  Stream<Map<String, dynamic>> get onTypingChanged => _typingController.stream;
  Stream<Map<String, dynamic>> get onMessagesRead => _readController.stream;

  void connect({required String serverUrl, required String token}) {
    if (_socket != null && _socket!.connected) return;

    _socket = IO.io(
      serverUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': 'Bearer $token'})
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(2000)
          .build(),
    );

    _socket!.onConnect((_) => debugPrint('⚡ [Socket] Connected: ${_socket?.id}'));
    _socket!.onDisconnect((reason) => debugPrint('🔌 [Socket] Disconnected: $reason'));

    // Receive new messages in real-time
    _socket!.on('chat:message', (data) {
      if (data is Map<String, dynamic>) {
        _messageController.add(ChatMessage.fromJson(data));
      }
    });

    // Receive typing indicator
    _socket!.on('chat:typing', (data) {
      if (data is Map<String, dynamic>) {
        _typingController.add(data);
      }
    });

    // Receive read receipt (blue ticks)
    _socket!.on('chat:read', (data) {
      if (data is Map<String, dynamic>) {
        _readController.add(data);
      }
    });

    _socket!.connect();
  }

  void joinChat(String chatId, {Function(bool success)? onAck}) {
    _socket?.emitWithAck('chat:join', {'chatId': chatId}, ack: (res) {
      onAck?.call(res['success'] == true);
    });
  }

  void leaveChat(String chatId) {
    _socket?.emit('chat:leave', {'chatId': chatId});
  }

  void sendMessage({
    required String chatId,
    required String text,
    Function(bool success, ChatMessage? message)? onAck,
  }) {
    _socket?.emitWithAck(
      'chat:message',
      {'chatId': chatId, 'text': text.trim()},
      ack: (res) {
        if (res is Map<String, dynamic> && res['success'] == true) {
          onAck?.call(true, ChatMessage.fromJson(res['message']));
        } else {
          onAck?.call(false, null);
        }
      },
    );
  }

  void sendTyping({required String chatId, required bool isTyping}) {
    _socket?.emit('chat:typing', {'chatId': chatId, 'isTyping': isTyping});
  }

  void markAsRead({required String chatId}) {
    _socket?.emit('chat:read', {'chatId': chatId});
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
```

---

### 5.5 Flutter Cloudinary Media Upload Service

Create `lib/services/profile_media_service.dart`:

```dart
import 'dart:io';
import 'package:dio/dio.dart';
import '../core/api_client.dart';
import '../models/profile_photo.dart';

class ProfileMediaService {
  final Dio _dio = ApiClient().dio;

  // 1. Upload single photo
  Future<List<ProfilePhoto>> uploadSinglePhoto(File file, {void Function(int, int)? onProgress}) async {
    final fileName = file.path.split('/').last;
    final formData = FormData.fromMap({
      'photo': await MultipartFile.fromFile(file.path, filename: fileName),
    });

    final res = await _dio.post('/profiles/photos', data: formData, onSendProgress: onProgress);
    final List list = res.data['data'];
    return list.map((e) => ProfilePhoto.fromJson(e)).toList();
  }

  // 2. Upload multiple photos (bulk)
  Future<List<ProfilePhoto>> uploadBulkPhotos(List<File> files) async {
    final List<MultipartFile> multipartFiles = [];
    for (var f in files) {
      multipartFiles.add(await MultipartFile.fromFile(f.path, filename: f.path.split('/').last));
    }
    final formData = FormData.fromMap({'photos': multipartFiles});
    final res = await _dio.post('/profiles/photos/bulk', data: formData);
    final List list = res.data['data'];
    return list.map((e) => ProfilePhoto.fromJson(e)).toList();
  }

  // 3. Set photo as primary DP
  Future<List<ProfilePhoto>> setPrimaryPhoto(String photoId) async {
    final res = await _dio.patch('/profiles/photos/$photoId/primary');
    final List list = res.data['data'];
    return list.map((e) => ProfilePhoto.fromJson(e)).toList();
  }

  // 4. Delete photo
  Future<List<ProfilePhoto>> deletePhoto(String photoId) async {
    final res = await _dio.delete('/profiles/photos/$photoId');
    final List list = res.data['data'];
    return list.map((e) => ProfilePhoto.fromJson(e)).toList();
  }

  // 5. Upload ID verification document (PDF or Image)
  Future<Map<String, dynamic>> uploadVerificationDoc(File file) async {
    final fileName = file.path.split('/').last;
    final formData = FormData.fromMap({
      'document': await MultipartFile.fromFile(file.path, filename: fileName),
    });
    final res = await _dio.post('/profiles/verification/upload', data: formData);
    return res.data['data'];
  }
}
```

---

### 5.6 Flutter Razorpay Checkout Service

Create `lib/services/payment_service.dart`:

```dart
import 'package:dio/dio.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../core/api_client.dart';

class PaymentService {
  final Dio _dio = ApiClient().dio;
  late Razorpay _razorpay;

  Function(String message)? onPaymentSuccess;
  Function(String error)? onPaymentError;

  void init({
    required Function(String message) onSuccess,
    required Function(String error) onError,
  }) {
    onPaymentSuccess = onSuccess;
    onPaymentError = onError;

    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
  }

  // Step 1: Create Order on backend and launch Razorpay UI
  Future<void> checkoutPlan({required String planId, required double amount, required String userPhone}) async {
    try {
      final res = await _dio.post('/payments/create-order', data: {
        'planId': planId,
        'amount': amount,
      });

      final orderData = res.data['data'];
      final keyId = orderData['keyId'] ?? 'rzp_test_placeholder';
      final orderId = orderData['orderId'];
      final amountInPaise = orderData['amountInPaise'];

      final options = {
        'key': keyId,
        'amount': amountInPaise,
        'name': 'HumaariShaadi Matrimony',
        'description': 'Subscription Plan: $planId',
        'order_id': orderId,
        'prefill': {'contact': userPhone},
      };

      _razorpay.open(options);
    } catch (e) {
      onPaymentError?.call('Order creation failed: $e');
    }
  }

  // Step 2: Handle Native Gateway Success & Verify with backend
  void _handlePaymentSuccess(PaymentSuccessResponse response) async {
    try {
      final res = await _dio.post('/payments/verify', data: {
        'orderId': response.orderId,
        'razorpay_order_id': response.orderId,
        'razorpay_payment_id': response.paymentId,
        'razorpay_signature': response.signature,
      });

      if (res.data['success'] == true) {
        onPaymentSuccess?.call('Subscription Activated Successfully!');
      } else {
        onPaymentError?.call(res.data['message'] ?? 'Verification failed');
      }
    } catch (e) {
      onPaymentError?.call('Server verification failed: $e');
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    onPaymentError?.call(response.message ?? 'Payment failed or cancelled');
  }

  void dispose() {
    _razorpay.clear();
  }
}
```

---

### 5.7 Flutter Firebase Push Notification Service

Create `lib/services/notification_service.dart`:

```dart
import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../core/api_client.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint("Handling background notification: ${message.messageId}");
}

class NotificationService {
  static final NotificationService instance = NotificationService._();
  NotificationService._();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localPlugin = FlutterLocalNotificationsPlugin();

  Future<void> initialize({Function(Map<String, dynamic> data)? onNotificationTap}) async {
    // 1. Permission request
    await _fcm.requestPermission(alert: true, badge: true, sound: true);

    // 2. Setup high priority channel for Android
    const channel = AndroidNotificationChannel(
      'humaari_shaadi_alerts',
      'HumaariShaadi Alerts',
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
    );

    await _localPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    // 3. Register device token on backend
    final token = await _fcm.getToken();
    if (token != null) {
      await registerTokenWithBackend(token);
    }

    _fcm.onTokenRefresh.listen(registerTokenWithBackend);

    // 4. Handle Foreground Messages (display popup banner)
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final notif = message.notification;
      if (notif != null) {
        _localPlugin.show(
          message.hashCode,
          notif.title,
          notif.body,
          NotificationDetails(
            android: AndroidNotificationDetails(
              channel.id,
              channel.name,
              importance: Importance.max,
              priority: Priority.high,
              icon: '@mipmap/ic_launcher',
            ),
          ),
          payload: jsonEncode(message.data),
        );
      }
    });

    // 5. Handle Background Notification Click
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      onNotificationTap?.call(message.data);
    });
  }

  Future<void> registerTokenWithBackend(String token) async {
    try {
      await ApiClient().dio.post('/notifications/device-token', data: {'token': token});
    } catch (_) {}
  }

  Future<void> unregisterTokenOnLogout() async {
    try {
      final token = await _fcm.getToken();
      await ApiClient().dio.delete('/notifications/device-token', data: {'token': token});
    } catch (_) {}
  }
}
```

#### Push Notification Deep Link Spec:
| `data.type` | Payload Keys | Flutter Action |
|:---|:---|:---|
| `"chat_message"` | `chatId`, `senderId` | Open `ChatScreen(chatId: data['chatId'])` |
| `"interaction_like"` | `fromUserId` | Open `ProfileDetailScreen(userId: data['fromUserId'])` |
| `"interaction_shortlist"` | `fromUserId` | Open `ShortlistScreen()` |
| `"interaction_contact"` | `fromUserId` | Open `ContactRequestsScreen()` |

---

## 6. Error Handling & HTTP Status Codes

| Code | Meaning | Action in Flutter App |
|:---|:---|:---|
| **`200 OK`** | Request succeeded. | Parse `data` field and update state. |
| **`201 Created`** | Resource created. | Navigate to next screen or append to list. |
| **`400 Bad Request`** | Invalid input, wrong OTP, or validation error. | Show message in `SnackBar` or alert dialog. |
| **`401 Unauthorized`** | Missing or expired JWT token. | Clear secure storage and redirect to `LoginScreen`. |
| **`403 Forbidden`** | Action not allowed (e.g., chat blocked). | Show warning banner. |
| **`404 Not Found`** | Profile or Chat ID does not exist. | Display "Profile not found". |
| **`500 Server Error`** | Unhandled internal exception. | Show "Something went wrong, please try again". |
| **`501 Not Implemented`** | Feature requires external adapter (e.g. PDF generator). | Inform user that feature is in development. |

---

## 7. Postman Collection Verification Note

The accompanying file **`humarishaadi-collection.json`** includes:
- Ready-to-run requests for all 78 endpoints.
- Auto-capture test scripts for `jwt_token`, `developmentOtp`, `userId`, `profileId`, `chatId`, `photoId`, and `orderId`.
- Sample request bodies pre-filled with valid Indian matrimonial profile data.
- Can be imported directly into **Postman**, **Thunder Client** (VS Code extension), or **Bruno**.

