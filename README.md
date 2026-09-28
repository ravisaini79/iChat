# IChat — Modern Mobile Messaging Application

Connect. Chat. Share.

IChat is a full-featured, WhatsApp-inspired mobile messaging application built with modern web and mobile technologies.

---

## Tech Stack

### Mobile (`mobile/`)
- **Framework**: Ionic 7+ / Angular 18+ (Standalone / Signals / Reactive Forms)
- **Language**: TypeScript
- **Styling**: SCSS (Custom IChat modern teal & glassmorphism theme)
- **Cross-Platform**: Capacitor (Android, iOS, Web/PWA)

### Backend (`server/`)
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Real-Time Engine**: Socket.IO
- **Media Engine**: Cloudinary integration
- **Auth**: Passwordless Mobile Number OTP + JWT (Access & Refresh Tokens)

---

## Quick Start (Development)

### Prerequisites
- Node.js (v20+)
- MongoDB running locally on `mongodb://localhost:27017/ichat` or via Docker:
  ```bash
  docker-compose up -d
  ```

### 1. Backend Server Setup
```bash
cd server
npm install
cp .env.example .env
npm run start:dev
```
Server runs at `http://localhost:3000`.

### 2. Mobile App Setup
```bash
cd mobile
npm install
npm run start
```
Mobile app runs at `http://localhost:8100`.

---

## Project Structure
```text
IChat/
├── mobile/             # Ionic Angular Mobile App
├── server/             # NestJS Backend API & Gateway
├── docker-compose.yml  # Local MongoDB/Redis services
└── README.md
```
