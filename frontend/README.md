# Tutoring App Frontend

A modern React + Vite frontend for your AI-powered tutoring platform.

## Features

- ✅ Firebase Authentication (Login/Signup)
- ✅ **Role-based Access Control** - Admin and Student accounts
- ✅ Student Dashboard with personalized content
- ✅ **Admin Panel** - User management, file oversight, analytics
- ✅ **Content Library** - Upload, organize, and manage files in folders (role-based access)
- ✅ Assignment Management
- ✅ Direct Messaging
- 🎨 Responsive Design

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Config

✅ **Already configured!** Your Firebase config is already set up in `src/firebase.js` using the values from your root `firebase.js`.

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
│   │   ├── Auth.jsx          # Login/Signup with role initialization
│   │   ├── Dashboard.jsx     # Main dashboard with role-based navigation
│   │   ├── ContentLibrary.jsx # File upload/management with folders
│   │   ├── AdminPanel.jsx    # Admin user/file management
│   │   └── ...
│   ├── utils/
│   │   └── userRoles.js      # Role management utilities
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
2. ✅ Firebase Authentication working
3. ✅ **Role-based access control implemented**
4. ✅ **Admin panel with user/file management**
5. ✅ **Content Library with admin oversight**
6. ⬜ Add assignment submission and AI grading
7. ⬜ Add real-time chat/messaging
8. ⬜ Deploy to production
9. ⬜ Add more admin analytics features

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
