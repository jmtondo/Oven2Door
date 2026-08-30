# Oven2Door-Mobile

Mobile application for Oven2Door built with Flutter.

## Project Structure

This project follows a modular, feature-first architecture pattern.

```
lib/
├── app/          # App setup, routing, and themes
├── core/         # Shared utilities, constants, and global widgets
├── models/       # Data models
├── api/          # API clients and HTTP endpoints
└── modules/      # Feature modules (Auth, Home, Products, Orders, etc.)
```

## Getting Started

1. Ensure Flutter SDK is installed on your system.
2. Run `flutter pub get` to install dependencies.
3. Run `flutter run` to launch the application.

## Firebase-to-MySQL signup sync

The signup screen first creates the Firebase Authentication account, then sends
its Firebase ID token and profile details to `POST /api/signup`. The Node server
verifies that token and stores the user in MySQL. Start it before registering:

```powershell
node backend/server.js
```

Ensure the MySQL `users` table has a unique or primary `user_id` column; this
allows safe retries without creating duplicate users. The default app endpoint
is `http://10.0.2.2:3000/api`, which is correct for the Android emulator. For a
physical phone, run Flutter with your computer's LAN address instead:

```powershell
flutter run --dart-define=API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:3000/api
```
