# Ultimate Tutor - Application Architecture Documentation

## Overview
Ultimate Tutor is a comprehensive tutoring platform built with React (frontend) and Firebase (backend). The application provides role-based access control for students, teachers, and administrators, featuring content library management, assignment creation and grading, and AI-powered grading capabilities using Hugging Face's Qwen models.

## Technology Stack

### Frontend
- **React 18** with Vite build system
- **React Router** for client-side routing
- **Firebase SDK v10.7.0** for authentication, database, and storage
- **CSS Modules** for component styling

### Backend
- **Firebase Functions** (Node.js 20 runtime)
- **Firebase Admin SDK v12.0.0** for server-side operations
- **Hugging Face Inference API** for AI grading
- **TypeScript** for type safety

### Database & Storage
- **Firestore** for NoSQL database operations
- **Firebase Storage** for file uploads and downloads
- **Firebase Authentication** for user management

## Application Structure

### Root Directory Structure
```
ultimate-tutor/
├── frontend/           # React application
├── functions/          # Firebase Cloud Functions
├── dataconnect/        # Firebase Data Connect schema
├── firestore.rules     # Firestore security rules
├── storage.rules       # Firebase Storage security rules
├── firebase.js         # Firebase configuration
├── cors.json          # CORS configuration
├── firestore.indexes.json  # Firestore indexes
└── README.md          # Project documentation
```

## Frontend Architecture (`frontend/`)

### Main Components

#### `App.jsx`
**Purpose**: Main application component handling authentication state and routing
- Manages Firebase authentication state with `onAuthStateChanged`
- Routes between `Auth` and `Dashboard` components based on user authentication
- Uses React Router for client-side navigation

#### `components/Auth.jsx`
**Purpose**: User authentication interface
- Login and signup forms
- Firebase Authentication integration
- Email/password authentication

#### `components/Dashboard.jsx`
**Purpose**: Main application dashboard with tabbed navigation
- Role-based navigation tabs (Overview, Content Library, Assignments, Messages, Admin Panel)
- Conditional rendering based on user roles (STUDENT, TEACHER, ADMIN)
- Integrates all major feature components

### Feature Components

#### `components/ContentLibrary.jsx`
**Purpose**: Shared content library for file management
- **Features**:
  - File upload to Firebase Storage
  - File download functionality
  - Role-based permissions (all users can view, teachers/admins can edit/delete)
  - File metadata display (name, size, upload date, uploader)
- **Security**: Uses Firestore rules to restrict write operations to teachers/admins

#### `components/AssignmentList.jsx`
**Purpose**: Assignment management and grading interface
- **Features**:
  - Student view: Submit assignments and view grades
  - Teacher/Admin view: Grade submissions with manual and AI grading
  - Dedicated grading tab for teachers/admins
  - AI grading integration using Hugging Face Qwen models
  - Submission tracking and status updates
- **AI Integration**: Calls Firebase Function `aiGradeAssignment` for automated grading

#### `components/CreateAssignment.jsx`
**Purpose**: Assignment creation interface (Teacher/Admin only)
- Form for creating new assignments
- Assignment metadata (title, description, due date, max points)
- Integration with Firestore assignments collection

#### `components/AdminPanel.jsx`
**Purpose**: Administrative functions and user management (Admin only)
- User role management
- System administration features
- Access restricted to ADMIN role users

### Utility Modules

#### `utils/userRoles.js`
**Purpose**: User role management and profile utilities
- **Constants**: Role definitions (STUDENT, TEACHER, ADMIN)
- **Functions**:
  - `getUserProfile(uid)`: Fetch user profile from Firestore
  - `updateUserRole(uid, role)`: Update user roles
- **Role Hierarchy**: ADMIN > TEACHER > STUDENT

#### `utils/submissions.js`
**Purpose**: Firebase operations for assignment submissions
- CRUD operations for submissions
- Integration with Firestore submissions collection
- File upload handling for submission attachments

### Configuration Files

#### `firebase.js`
**Purpose**: Firebase configuration and initialization
- Firebase app initialization
- Export of Firebase services (auth, firestore, storage, functions)
- Configuration object with project credentials

## Backend Architecture (`functions/`)

### Firebase Functions

#### `aiGradeAssignment` (Cloud Function)
**Purpose**: AI-powered assignment grading using Hugging Face Qwen models
- **Authentication**: Requires authenticated user with TEACHER or ADMIN role
- **Input Parameters**:
  - `submissionId`: Submission document ID
  - `assignmentId`: Assignment document ID
  - `assignmentDescription`: Assignment requirements
  - `submissionText`: Student submission content
  - `maxPoints`: Maximum possible grade
- **AI Processing**:
  - Uses Qwen2.5-7B-Instruct model via Hugging Face Inference API
  - Generates structured feedback with numerical grade
  - Temperature: 0.1 for consistent grading
- **Output**: Updates submission and assignment documents with grade and feedback
- **Security**: Validates user permissions and input parameters

### Configuration
- **Runtime**: Node.js 20
- **Secrets**: HUGGINGFACE_API_KEY stored as Firebase secret
- **Dependencies**: axios for API calls, firebase-admin for Firestore operations

## Database Schema (`dataconnect/schema/`)

### Firestore Collections

#### `users`
- **Purpose**: User profiles and authentication data
- **Fields**:
  - `displayName`: User's display name
  - `email`: User email address
  - `role`: User role (STUDENT/TEACHER/ADMIN)
  - `photoUrl`: Profile picture URL
  - `bio`: User biography
  - `createdAt`: Account creation timestamp

#### `files`
- **Purpose**: Content library file metadata
- **Fields**:
  - `name`: File name
  - `size`: File size in bytes
  - `type`: MIME type
  - `uploadedBy`: Uploader's UID
  - `uploadedAt`: Upload timestamp
  - `downloadUrl`: Firebase Storage download URL

#### `assignments`
- **Purpose**: Assignment definitions and metadata
- **Fields**:
  - `title`: Assignment title
  - `description`: Assignment requirements
  - `studentId`: Assigned student UID
  - `createdBy`: Creator UID (teacher/admin)
  - `dueDate`: Assignment deadline
  - `maxPoints`: Maximum grade possible
  - `status`: Assignment status (active/graded/etc.)

#### `submissions`
- **Purpose**: Student assignment submissions
- **Fields**:
  - `assignmentId`: Reference to assignment
  - `studentId`: Submitting student UID
  - `submissionText`: Student work content
  - `submittedAt`: Submission timestamp
  - `grade`: Numerical grade (0-maxPoints)
  - `feedback`: Grading feedback
  - `graded`: Boolean indicating if graded
  - `aiGraded`: Boolean indicating AI grading
  - `gradedBy`: Grader UID
  - `gradedAt`: Grading timestamp

## Security Model

### Authentication
- **Firebase Authentication**: Email/password authentication
- **Session Management**: Automatic token refresh and validation

### Authorization (Firestore Rules)
- **Users Collection**: Read access for all authenticated users, write access for own profile
- **Files Collection**: Read access for all authenticated users, write access for uploader or admins
- **Assignments Collection**: Read access for assigned students and admins, write access for admins only
- **Submissions Collection**: Read access for all authenticated users, write access based on ownership/admin status

### Storage Security
- **Content Files**: Read access for all authenticated users, write access for file owners
- **Submissions**: Read access for all authenticated users, write access for submitters and admins

## AI Grading System

### Hugging Face Integration
- **Model**: Qwen/Qwen2.5-7B-Instruct
- **API**: Hugging Face Inference API
- **Prompt Engineering**: Structured prompts for consistent grading output
- **Response Parsing**: JSON extraction from AI responses with fallback handling

### Grading Process
1. **Input Validation**: Verify user permissions and required parameters
2. **AI Processing**: Send structured prompt to Hugging Face API
3. **Response Parsing**: Extract grade and feedback from AI response
4. **Database Update**: Store grade and feedback in Firestore
5. **Error Handling**: Fallback grading for parsing failures

## Deployment & Configuration

### Environment Setup
1. **Firebase Project**: Create Firebase project with Authentication, Firestore, Storage, Functions enabled
2. **API Keys**: Configure Hugging Face API key as Firebase secret
3. **CORS**: Configure CORS settings for cross-origin requests

### Build & Deploy
- **Frontend**: `npm run build` (Vite) → Deploy to Firebase Hosting
- **Functions**: `npm run deploy` (Firebase CLI) → Deploy to Cloud Functions
- **Database**: Firestore rules deployed via Firebase CLI

### Development
- **Frontend**: `npm run dev` (Vite dev server)
- **Functions**: `npm run serve` (Firebase emulators)
- **Testing**: Local emulators for Firestore, Functions, and Storage

## User Roles & Permissions

### STUDENT
- View shared content library
- View and submit assignments
- View own grades and feedback
- Upload submission files

### TEACHER
- All STUDENT permissions
- Create and manage assignments
- Grade student submissions (manual and AI)
- Upload content to shared library
- Edit/delete own uploaded content

### ADMIN
- All TEACHER permissions
- Access admin panel
- Manage user roles
- Full system administration
- Edit/delete all content

## API Endpoints

### Firebase Functions
- `aiGradeAssignment`: POST (callable function)
  - **Auth Required**: TEACHER or ADMIN
  - **Input**: submissionId, assignmentId, assignmentDescription, submissionText, maxPoints
  - **Output**: grade (number), feedback (string)

## Error Handling & Logging

### Frontend Error Handling
- Firebase error codes mapped to user-friendly messages
- Loading states for async operations
- Graceful fallbacks for failed operations

### Backend Error Handling
- Authentication validation
- Input parameter validation
- AI API error handling with fallbacks
- Firebase Functions logging for debugging

## Future Enhancements

### Planned Features
- Real-time messaging system
- Video conferencing integration
- Advanced analytics dashboard
- Mobile application
- Multi-language support
- Advanced AI tutoring features

### Technical Improvements
- Unit and integration testing
- CI/CD pipeline
- Performance monitoring
- Advanced caching strategies
- Progressive Web App features

## Troubleshooting

### Common Issues
1. **Firebase Permissions**: Check Firestore/Storage rules and user roles
2. **AI Grading Failures**: Verify Hugging Face API key and function deployment
3. **CORS Errors**: Ensure proper CORS configuration for callable functions
4. **Build Failures**: Check Node.js version compatibility (v20 required)

### Debug Tools
- Firebase Console for database and function logs
- Browser DevTools for frontend debugging
- Firebase Emulators for local testing

## Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Implement changes with proper error handling
4. Test with Firebase emulators
5. Submit pull request with documentation

### Code Standards
- React functional components with hooks
- TypeScript for backend functions
- Consistent error handling patterns
- Comprehensive logging for debugging

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: Development Team</content>
<parameter name="filePath">c:\Users\wow01\Documents\New folder\ARCHITECTURE.md