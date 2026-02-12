# Server - Mortgage Real Estate CRM Backend

This is the backend API server for the Mortgage Real Estate CRM system, built with Node.js, Express, and MongoDB.

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database (via Mongoose)
- **JWT** - Authentication tokens (access + refresh tokens)
- **Multer** - File upload handling
- **Nodemailer** - Email service
- **Tesseract.js** - OCR for text extraction
- **PDF-lib** - PDF manipulation
- **OpenAI** - AI-powered text extraction
- **Google Generative AI** - Alternative AI text extraction
- **Firebase Admin** - File storage service
- **PM2** - Process manager for production
- **Joi** - Request validation

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14.x or later)
- **npm** (v6.x or later)
- **MongoDB** (local or cloud instance like MongoDB Atlas)
- **GraphicsMagick** (for image processing) - Required on Windows
- **Ghostscript** (for PDF processing) - Required on Windows

### Windows-Specific Setup

The server requires GraphicsMagick and Ghostscript to be installed and added to PATH:

1. Install GraphicsMagick from: https://www.graphicsmagick.org/download.html
2. Install Ghostscript from: https://www.ghostscript.com/download/gsdnld.html
3. Ensure both are added to your system PATH

The server automatically adds these to PATH on startup (see `src/bin/www.js`).

## Getting Started

### 1. Install Dependencies

Navigate to the server directory and install all required dependencies:

```bash
cd server
npm install
```

### 2. Environment Variables

Create a `.env` file in the `server` directory with the following required variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/mortgage-crm

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:5173

# OpenAI Configuration (Optional - for AI text extraction)
OPENAI_API_KEY=your-openai-api-key
GPT_MODEL=gpt-4

# Google Generative AI (Optional - alternative AI text extraction)
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-api-key

# Firebase Admin (Optional - for file storage)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket

# JWT Secrets (Optional - will be auto-generated if not provided)
# JWT_SECRET=your-jwt-secret
# REFRESH_TOKEN_SECRET=your-refresh-token-secret
```

**Important:** 
- Replace placeholder values with your actual credentials
- For Gmail, use an App Password instead of your regular password
- MongoDB URI can point to a local instance or MongoDB Atlas
- JWT secrets are stored in `src/secrets/JWT/` and `src/secrets/Refresh-Token/` directories
- Firebase Admin is optional - files can be stored locally if not configured

### 3. Database Setup

Ensure MongoDB is running:

- **Local MongoDB**: Start your local MongoDB service
- **MongoDB Atlas**: Use your connection string in `MONGO_URI`

The application will automatically connect to MongoDB on startup. Master fields and admin user are automatically seeded on first run.

### 4. Run Development Server

Start the development server with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

### 5. Run Production Server

For production with PM2:

```bash
npm run build
```

This starts the server using PM2 process manager (see `ecosystem.config.js`).

## Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run prod` - Start production server with auto-reload
- `npm run build` - Start server with PM2 process manager
- `npm test` - Run tests (placeholder)

## Project Structure

```
server/
├── src/
│   ├── bin/
│   │   └── www.js              # Server entry point
│   ├── config/                 # Configuration files
│   │   ├── env.config.js       # Environment variables
│   │   ├── mongo.config.js     # MongoDB configuration
│   │   ├── nodemailer.config.js # Email configuration
│   │   ├── openai.config.js    # OpenAI configuration
│   │   ├── firebaseAdmin.config.js # Firebase Admin configuration
│   │   └── secrets.config.js   # JWT secrets management
│   ├── constants/              # Application constants
│   ├── controllers/            # Request handlers
│   │   ├── auth.controller.js
│   │   ├── auditTrail.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── extraction.controller.js
│   │   ├── masterFields.controller.js
│   │   ├── submission.controller.js
│   │   ├── submissionFields.controller.js
│   │   ├── template.controller.js
│   │   └── user.controller.js
│   ├── middlewares/            # Express middlewares
│   │   ├── auth.middleware.js
│   │   ├── hasRole.middleware.js
│   │   ├── validate.middleware.js
│   │   ├── getDeviceId.middleware.js
│   │   └── ...
│   ├── models/                 # Mongoose models
│   │   ├── user.model.js
│   │   ├── submission.model.js
│   │   ├── template.model.js
│   │   ├── masterFields.model.js
│   │   ├── file.model.js
│   │   ├── auditTrail.model.js
│   │   └── otp.model.js
│   ├── routes/                 # API routes
│   │   ├── auth.routes.js
│   │   ├── extraction.routes.js
│   │   ├── submission.routes.js
│   │   ├── template.routes.js
│   │   ├── masterFields.routes.js
│   │   ├── user.routes.js
│   │   ├── dashboard.routes.js
│   │   └── auditTrail.routes.js
│   ├── services/               # Business logic
│   │   ├── auth.service.js
│   │   ├── email.service.js
│   │   ├── file.service.js
│   │   ├── firebaseStorgae.service.js
│   │   ├── storage.service.js
│   │   ├── textextraction.service.js
│   │   ├── pdfRender.service.js
│   │   ├── template.service.js
│   │   ├── submission.service.js
│   │   ├── submissionFields.service.js
│   │   ├── masterFields.service.js
│   │   ├── user.service.js
│   │   ├── dashboard.service.js
│   │   ├── auditTrail.service.js
│   │   └── otp.service.js
│   ├── validations/            # Request validation schemas (Joi)
│   │   ├── auth.validation.js
│   │   ├── user.validation.js
│   │   ├── dashboard.validation.js
│   │   └── custom.validation.js
│   ├── utils/                  # Utility functions
│   │   ├── jwt.utils.js
│   │   ├── bcrypt.utils.js
│   │   ├── files.utils.js
│   │   ├── gpt.utils.js
│   │   └── ...
│   ├── sanitizers/             # Response sanitizers
│   │   └── response.sanitizer.js
│   ├── Responses/              # Standardized response helpers
│   ├── email-templates/         # Email templates (EJS)
│   ├── seeders/                 # Database seeders
│   │   ├── adminUser.seeder.js
│   │   ├── masterFields.seeder.js
│   │   └── verifyAdmin.js
│   ├── secrets/                 # JWT secret files
│   │   ├── JWT/
│   │   └── Refresh-Token/
│   └── tmp/                     # Temporary file storage
├── uploads/                     # Uploaded files directory
├── ecosystem.config.js          # PM2 configuration
└── package.json                 # Dependencies and scripts
```

## API Endpoints

All API endpoints are prefixed with `/backend/api`.

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `DELETE /auth/logout` - User logout
- `GET /auth/refresh` - Refresh access token
- `GET /auth/profile` - Get current user profile
- `POST /auth/update-profile` - Update user profile (with profile picture upload)
- `POST /auth/change-password` - Change user password
- `GET /auth/resend-email-verification-otp` - Resend email verification OTP
- `POST /auth/verify-email` - Verify email with OTP
- `POST /auth/forget-password` - Request password reset
- `POST /auth/reset-password-otp-verification` - Verify password reset OTP
- `POST /auth/resend-password-reset-otp` - Resend password reset OTP
- `PUT /auth/reset-password` - Reset password
- `GET /auth/username-availbility/:username` - Check username availability

### Documents & Extraction

- `POST /extraction/cnic/extract-name/:id` - Upload and extract name from CNIC (Admin, Agent)
- `POST /extraction/documents/extract-fields/:id` - Upload and extract fields from documents (Admin, Agent)

### Submissions

- `GET /submissions` - Get all submissions (Admin, Agent, Viewer)
- `POST /submissions` - Create new submission (Admin)
- `GET /submissions/:key` - Get submission by key (Admin, Agent, Viewer)
- `PUT /submissions/:key` - Update submission (Admin, Agent)
- `GET /submissions/:id/documents` - List submission documents (Admin, Agent, Viewer)
- `PUT /submissions/:id/documents/:docEntryId` - Replace submission document (Admin, Agent)
- `DELETE /submissions/:id/documents/:docEntryId` - Delete submission document (Admin, Agent)
- `GET /submissions/:id/field-status` - Get field status for submission (Admin, Agent, Viewer)
- `PATCH /submissions/:id/field-status` - Update field status (Admin, Agent)
- `POST /submissions/:id/recompute-fields` - Recompute submission fields (Admin, Agent)

### Templates

- `GET /templates` - Get all templates (Admin, Agent, Viewer)
- `POST /templates` - Create template (Admin)
- `GET /templates/:id` - Get template by ID (Admin, Agent, Viewer)
- `PUT /templates/:id/placements` - Save template placements (Admin)
- `POST /templates/:id/render` - Render template to PDF (Admin)

### Master Fields

- `GET /master-fields/fields` - Get all master fields (Admin, Agent, Viewer)
- `POST /master-fields/fields` - Create master field (Admin)
- `GET /master-fields/fields/:key` - Get master field by key (Admin, Agent, Viewer)
- `PUT /master-fields/fields/:key` - Update master field (Admin)
- `DELETE /master-fields/fields/:key` - Delete master field (Admin)
- `DELETE /master-fields/fields` - Delete multiple master fields (Admin)

### Users (Admin Only)

- `GET /users` - List all users (Admin)
- `GET /users/:id` - Get user by ID (Admin)
- `POST /users` - Create new user (Admin)
- `PUT /users/:id` - Update user (Admin)
- `DELETE /users/:id` - Delete user (Admin)

### Dashboard

- `GET /dashboard/summary` - Get dashboard summary statistics (Admin, Agent, Viewer)
- `GET /dashboard/trends` - Get dashboard trends data (Admin, Agent, Viewer)
- `GET /dashboard/validation-failures` - Get validation failures (Admin, Agent, Viewer)
- `GET /dashboard/workload` - Get workload distribution (Admin, Agent, Viewer)

### Audit Trail

- `GET /audit-trail/recent` - Get recent audit logs (All authenticated users)
- `GET /audit-trail/submission/:id` - Get submission-specific audit trail (All authenticated users)

## Role-Based Access Control

The system supports three user roles:

- **Admin**: Full access to all features including user management, template creation, and master field management
- **Agent**: Can create submissions, upload documents, extract fields, and review/approve data. Cannot manage templates or master fields
- **Viewer**: Read-only access to submissions, templates, and master fields. Cannot make any changes

## Key Features

- **Authentication & Authorization** - JWT-based auth with role-based access control (RBAC)
- **File Upload & Processing** - Support for PDF, images, and documents with Firebase or local storage
- **Text Extraction** - OCR (Tesseract.js) and AI-powered text extraction (OpenAI/Google Generative AI)
- **Email Service** - Email verification and password reset with OTP
- **Document Generation** - PDF document generation from templates with field placements
- **Data Validation** - Request validation using Joi
- **Audit Trail** - Comprehensive logging of user actions for compliance
- **Dashboard Analytics** - Real-time statistics, trends, validation failures, and workload distribution
- **Profile Management** - User profile with profile picture upload
- **Master Fields** - Centralized field definitions with validation rules
- **Submission Management** - Complete workflow for document processing and field extraction

## Development Notes

- The server uses MongoDB with Mongoose for data modeling
- JWT tokens are used for authentication (access token + refresh token)
- File uploads are handled using Multer (memory storage)
- Temporary files are stored in `src/tmp/` directory
- Permanent uploads are stored in `uploads/` directory or Firebase Storage
- Master fields and admin user are automatically seeded on server startup
- Audit logs track all important user actions (template CRUD, master field CRUD, document operations, field edits, etc.)
- Profile picture changes are excluded from document audit logs

## Security Considerations

- Environment variables should never be committed to version control
- JWT secrets are stored in separate files in `src/secrets/` directory
- Password hashing is done using bcrypt
- CORS is configured to allow requests from the frontend
- Request validation is enforced on all endpoints using Joi
- Role-based access control (RBAC) is implemented at the route level
- Device ID tracking for session management

## Troubleshooting

### MongoDB Connection Issues

If you encounter MongoDB connection errors:

1. Ensure MongoDB is running:
   ```bash
   # Check MongoDB status
   mongosh
   ```

2. Verify your `MONGO_URI` in `.env` is correct
3. Check firewall settings if using remote MongoDB

### Port Already in Use

If port 3000 is already in use:

1. Change `PORT` in your `.env` file
2. Or kill the process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

### GraphicsMagick/Ghostscript Errors

If you see errors related to image/PDF processing:

1. Ensure GraphicsMagick and Ghostscript are installed
2. Verify they are in your system PATH
3. Restart your terminal/IDE after installation

### Email Service Issues

If emails are not sending:

1. Verify SMTP credentials in `.env`
2. For Gmail, ensure you're using an App Password
3. Check firewall/network settings
4. Review email service logs

### Firebase Storage Issues

If Firebase storage is not working:

1. Verify Firebase credentials in `.env`
2. Ensure Firebase Storage bucket is properly configured
3. Check Firebase Admin SDK initialization
4. Files will fall back to local storage if Firebase is not configured

## Production Deployment

### Using PM2

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the server:
   ```bash
   npm run build
   ```

3. Monitor the process:
   ```bash
   pm2 list
   pm2 logs
   ```

4. Stop the server:
   ```bash
   pm2 stop node-auth-backend
   ```

### Environment Setup

Ensure all production environment variables are set:
- Use strong JWT secrets
- Use production MongoDB URI
- Configure production email service
- Set `NODE_ENV=production`
- Configure Firebase Storage for production file storage (optional)

## Support

For issues or questions, please refer to the main project documentation or contact the development team.
