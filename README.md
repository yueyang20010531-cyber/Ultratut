# Ultimate Tutor

A comprehensive tutoring platform built with React and Firebase, featuring role-based access control, content library management, assignment tracking, and AI-powered grading using Hugging Face's Qwen models.

## Features

- **Role-Based Access Control**: Support for Students, Teachers, and Administrators
- **Content Library**: Shared file storage with role-based permissions
- **Assignment Management**: Create, submit, and grade assignments
- **AI Grading**: Automated grading using Hugging Face Qwen2.5-7B-Instruct model
- **Real-time Updates**: Live synchronization with Firebase
- **Secure File Storage**: Firebase Storage with granular permissions

## Technology Stack

- **Frontend**: React 18 + Vite
- **Backend**: Firebase Functions (Node.js 20)
- **Database**: Firestore
- **Storage**: Firebase Storage
- **Authentication**: Firebase Auth
- **AI**: Hugging Face Inference API

## Quick Start

### Prerequisites
- Node.js 20+
- Firebase CLI
- Firebase project with required services enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ultimate-tutor
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../functions
   npm install
   ```

4. **Configure Firebase**
   - Copy your Firebase config to `frontend/src/firebase.js`
   - Set up Hugging Face API key as Firebase secret: `HUGGINGFACE_API_KEY`

5. **Deploy Firebase resources**
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   firebase deploy --only functions
   ```

6. **Start development**
   ```bash
   cd frontend
   npm run dev
   ```

## User Roles

- **STUDENT**: View content, submit assignments, view grades
- **TEACHER**: All student permissions + create assignments, grade submissions, manage content
- **ADMIN**: All teacher permissions + user management, system administration

## Project Structure

```
ultimate-tutor/
├── frontend/           # React application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── utils/      # Utility functions
│   │   └── firebase.js # Firebase config
├── functions/          # Firebase Cloud Functions
├── dataconnect/        # Database schema
└── ARCHITECTURE.md     # Detailed documentation
```

## Documentation

For detailed information about the application architecture, components, security model, and deployment instructions, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Development

### Available Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Functions:**
- `npm run build` - Compile TypeScript
- `npm run serve` - Start Firebase emulators
- `npm run deploy` - Deploy functions

### Testing
- Use Firebase emulators for local testing
- Test with different user roles to verify permissions
- Verify AI grading functionality with sample assignments

## Contributing

1. Follow the existing code structure and patterns
2. Add proper error handling and logging
3. Test with Firebase emulators
4. Update documentation for new features

## License

[Your License Here]

---

**Version**: 1.0.0
**Last Updated**: December 2024
