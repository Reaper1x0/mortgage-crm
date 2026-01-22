# Server - Mortgage Real Estate CRM Backend

This is the backend API server for the Mortgage Real Estate CRM system, built with Node.js, Express, and MongoDB.

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database (via Mongoose)
- **JWT** - Authentication tokens
- **Multer** - File upload handling
- **Nodemailer** - Email service
- **Tesseract.js** - OCR for text extraction
- **PDF-lib** - PDF manipulation
- **OpenAI** - AI-powered text extraction
- **PM2** - Process manager for production

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

# JWT Secrets (Optional - will be auto-generated if not provided)
# JWT_SECRET=your-jwt-secret
# REFRESH_TOKEN_SECRET=your-refresh-token-secret
```

**Important:** 
- Replace placeholder values with your actual credentials
- For Gmail, use an App Password instead of your regular password
- MongoDB URI can point to a local instance or MongoDB Atlas
- JWT secrets are stored in `src/secrets/JWT/` and `src/secrets/Refresh-Token/` directories

### 3. Database Setup

Ensure MongoDB is running:

- **Local MongoDB**: Start your local MongoDB service
- **MongoDB Atlas**: Use your connection string in `MONGO_URI`

The application will automatically connect to MongoDB on startup.

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
│   │   └── ...
│   ├── controllers/            # Request handlers
│   │   ├── auth.controller.js
│   │   ├── extraction.controller.js
│   │   ├── masterFields.controller.js
│   │   ├── submission.controller.js
│   │   └── template.controller.js
│   ├── middlewares/            # Express middlewares
│   │   ├── auth.middleware.js
│   │   ├── validate.middleware.js
│   │   └── ...
│   ├── models/                 # Mongoose models
│   │   ├── user.model.js
│   │   ├── submission.model.js
│   │   ├── template.model.js
│   │   └── ...
│   ├── routes/                 # API routes
│   │   ├── auth.routes.js
│   │   ├── extraction.routes.js
│   │   └── ...
│   ├── services/               # Business logic
│   │   ├── auth.service.js
│   │   ├── email.service.js
│   │   ├── file.service.js
│   │   ├── textextraction.service.js
│   │   └── ...
│   ├── validations/            # Request validation schemas
│   ├── utils/                  # Utility functions
│   ├── secrets/                # JWT secret files
│   └── tmp/                    # Temporary file storage
├── uploads/                    # Uploaded files directory
├── ecosystem.config.js         # PM2 configuration
└── package.json                # Dependencies and scripts
```

## API Endpoints

### Authentication

- `POST /backend/api/auth/register` - User registration
- `POST /backend/api/auth/login` - User login
- `POST /backend/api/auth/verify-email` - Email verification
- `POST /backend/api/auth/forgot-password` - Request password reset
- `POST /backend/api/auth/reset-password` - Reset password

### Documents & Extraction

- `POST /backend/api/extraction/upload` - Upload documents
- `POST /backend/api/extraction/extract` - Extract text from documents

### Submissions

- `GET /backend/api/submissions` - Get all submissions
- `POST /backend/api/submissions` - Create submission
- `GET /backend/api/submissions/:id` - Get submission by ID

### Templates

- `GET /backend/api/templates` - Get all templates
- `POST /backend/api/templates` - Create template
- `PUT /backend/api/templates/:id` - Update template

### Master Fields

- `GET /backend/api/master-fields` - Get all master fields
- `POST /backend/api/master-fields` - Create master field

## Key Features

- **Authentication & Authorization** - JWT-based auth with role-based access control
- **File Upload & Processing** - Support for PDF, images, and documents
- **Text Extraction** - OCR and AI-powered text extraction from documents
- **Email Service** - Email verification and password reset
- **Document Generation** - PDF document generation from templates
- **Data Validation** - Request validation using Joi

## Development Notes

- The server uses MongoDB with Mongoose for data modeling
- JWT tokens are used for authentication (access token + refresh token)
- File uploads are handled using Multer
- Temporary files are stored in `src/tmp/` directory
- Permanent uploads are stored in `uploads/` directory
- Master fields are automatically seeded on server startup

## Security Considerations

- Environment variables should never be committed to version control
- JWT secrets are stored in separate files in `src/secrets/` directory
- Password hashing is done using bcrypt
- CORS is configured to allow requests from the frontend
- Request validation is enforced on all endpoints

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

## Support

For issues or questions, please refer to the main project documentation or contact the development team.

