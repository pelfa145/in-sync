# Couples Memories

A React Native (Expo) app for couples to share photos, videos, voice memos, letters, and songs. Includes account system, partner pairing, and chat.

## Features

- **Account system**: Sign up / sign in with email and password (Firebase Auth)
- **Partner pairing**: Share a code to link accounts
- **Memories**: Add photos, videos, voice memos, letters, and songs
- **Compression**: All media is compressed before upload to minimize storage
- **Chat**: 1:1 messaging between partners

## Setup

### 1. Firebase

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password sign-in)
3. Create a **Firestore Database**
4. Create a **Storage** bucket
5. Add an Android app and copy the config
6. Edit `src/config/firebase.ts` and replace the placeholder values:

```ts
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

7. Deploy Firestore indexes (optional, Firebase will prompt when needed):

```bash
firebase deploy --only firestore:indexes
```

### 2. Assets

Add `assets/icon.png` (1024×1024) and `assets/splash.png` for your app icon and splash screen. Or remove/update these in `app.json`.

### 3. Install and run

```bash
npm install
npx expo start
```

Press `a` for Android or `i` for iOS.

### 4. Build APK

For a production APK, use [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npx eas build --platform android --profile preview
```

## Compression

- **Photos**: Resized to max 1200px, compressed (JPEG ~80% quality)
- **Videos**: Auto compression (WhatsApp-style)
- **Audio**: Compressed before upload

## Tech stack

- Expo SDK 52
- React Navigation
- Firebase (Auth, Firestore, Storage)
- expo-image-picker, expo-document-picker, expo-av
- react-native-compressor
- expo-image-manipulator
