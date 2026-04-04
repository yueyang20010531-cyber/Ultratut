# Tutoring App Frontend

A modern React + Vite frontend for your AI-powered tutoring platform.

## Features

- ✅ Firebase Authentication (Login/Signup)
- ✅ Student Dashboard
- ✅ Content Library
- ✅ Assignment Management
- ✅ Direct Messaging
- 🎨 Responsive Design

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

Create a `.env.local` file in this directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Get these values from your Firebase Console → Project Settings.

### 3. Run Locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Build for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized files.

## Deploy to Vercel (Recommended)

### Option A: Via Git (Easiest)

1. Push this folder to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repo
5. Add your environment variables from `.env.local`
6. Click Deploy

### Option B: Via CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts and Vercel will deploy automatically.

## Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Build the app:
```bash
npm run build
```

3. Deploy:
```bash
firebase deploy --only hosting
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Auth.jsx          # Login/Signup
│   │   ├── Dashboard.jsx     # Main dashboard
│   │   └── ...
│   ├── firebase.js           # Firebase config
│   ├── App.jsx               # Main component
│   ├── main.jsx              # React entry point
│   └── index.css             # Global styles
├── index.html                # HTML entry
├── vite.config.js            # Vite config
└── package.json              # Dependencies
```

## Next Steps

1. ✅ Frontend scaffolded
2. ⬜ Connect to backend API
3. ⬜ Add content library features
4. ⬜ Integrate AI grading
5. ⬜ Add real-time chat
6. ⬜ Deploy to production

## Environment Variables

All Firebase config values are in `.env.local`. Never commit this file!

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **Firebase** - Backend + Auth + Database + Storage
- **React Router** - Navigation

## Support

For Firebase issues, see [Firebase Docs](https://firebase.google.com/docs)
For Vite issues, see [Vite Docs](https://vitejs.dev)
