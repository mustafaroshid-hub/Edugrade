# EduGrade — Smart Result Management System

## Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
The `.env` file is already configured with your Firebase credentials.

### 3. Firebase Firestore Rules
Go to **Firebase Console → Firestore → Rules** and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      // Admin can write all user docs
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Projects: only owner can read/write
    match /projects/{projectId} {
      allow read, write: if request.auth != null && 
        resource.data.teacherId == request.auth.uid;
      allow create: if request.auth != null;

      // Students subcollection
      match /students/{studentId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

### 4. Firebase Indexes
Go to **Firebase Console → Firestore → Indexes → Add Index**:
- Collection: `projects`
- Fields: `teacherId` (Ascending), `createdAt` (Descending)

### 5. Run locally
```bash
npm run dev
```

### 6. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# Settings → Environment Variables → add all VITE_* vars from .env
```

## Features
- ✅ Teacher accounts with admin control
- ✅ Custom exam configuration (CA + Exam or Exam Only)
- ✅ Unlimited subjects per exam
- ✅ Per-subject full marks customization
- ✅ MCQ/Oral + Creative/Written tracking
- ✅ Custom GPA scale (or default Bangladesh standard)
- ✅ Live mark calculation with grade preview
- ✅ Stats dashboard with grade distribution
- ✅ Merit table with top performer highlights
- ✅ PDF merit list download
- ✅ Admin user management (block/unblock)

## Default GPA Scale (Bangladesh)
| Marks | Grade | GPA |
|-------|-------|-----|
| 80-100 | A+ | 5.00 |
| 70-79  | A  | 4.00 |
| 60-69  | A- | 3.50 |
| 50-59  | B  | 3.00 |
| 40-49  | C  | 2.00 |
| 33-39  | D  | 1.00 |
| 0-32   | F  | 0.00 |

## Admin Account
Admin: mustafaroshid@gmail.com
Register with this email to get admin access automatically.
