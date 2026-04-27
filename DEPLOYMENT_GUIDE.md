# Deployment Guide for Assignment Submission System

## Firebase Rules Update

The latest changes require updating your Firebase security rules to allow the submission feature to work. Follow these steps:

### 1. Update Firestore Rules (firestore.rules)

The `submissions` collection rule has been added. Deploy with:

```bash
firebase deploy --only firestore:rules
```

This adds rules for the `submissions` collection allowing:
- Students to read/create their own submissions
- Teachers/Admins to read all submissions and manage them

### 2. Update Storage Rules (storage.rules)

The `submissions/` folder rule has been added. Deploy with:

```bash
firebase deploy --only storage
```

This adds rules for the `submissions/` folder allowing:
- Users to upload files to the submissions folder
- Teachers/Admins to read all submission files
- Deletion permissions for appropriate users

### 3. Deploy Both Rules

To deploy both at once:

```bash
firebase deploy --only firestore:rules,storage
```

## What Was Fixed

✅ **Firestore Permissions**: Students can now create and read their own submissions; teachers/admins can read all  
✅ **Storage Permissions**: Students can upload assignment files to Cloud Storage  
✅ **Error Handling**: Improved error handling in submissions utility to gracefully handle permission errors  
✅ **Query Optimization**: Removed composite index requirements by doing client-side sorting  

## Testing the Feature

1. **As a Student**:
   - Navigate to Assignments
   - Click on an assignment
   - Select a file and click "Submit Assignment"
   - Verify the file uploads and status changes to "✓ Submitted"

2. **As a Teacher/Admin**:
   - Go to Admin Panel → Submissions
   - View all student submissions
   - Click "Grade" to add points and feedback
   - Verify grades appear in the Assignment Management view

## Troubleshooting

### Error: "Missing or insufficient permissions" when loading submissions
- Ensure `firestore.rules` has been deployed
- Check that the `submissions` collection rule exists
- Refresh the page after deployment

### Error: "User does not have permission to access submissions/" in Storage
- Ensure `storage.rules` has been deployed
- Check that the `submissions/` folder rule exists
- Clear browser cache and try again

### Files not uploading
- Verify Firebase Storage rules are deployed
- Check browser console for specific error messages
- Ensure the user is authenticated

## Firebase Configuration

The app uses:
- **Firestore** for storing submission metadata
- **Cloud Storage** for storing submitted files
- **Authentication** via Firebase Auth

All endpoints are configured in `frontend/src/firebase.js` and `firestore.rules`/`storage.rules`.

## Additional Resources

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/rules)
- [Firestore Rules Guide](https://firebase.google.com/docs/firestore/security/start)
- [Cloud Storage Rules Guide](https://firebase.google.com/docs/storage/security)
