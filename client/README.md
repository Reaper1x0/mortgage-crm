# Client - Mortgage Real Estate CRM

This is the frontend application for the Mortgage Real Estate CRM system, built with React, TypeScript, and Vite.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Redux Toolkit** - State management
- **React Router v7** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React PDF** - PDF viewer component
- **Recharts** - Chart library for analytics
- **React Quill** - Rich text editor
- **React Icons** - Icon library

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16.x or later recommended)
- **npm** (v7.x or later) or **yarn**

## Getting Started

### 1. Install Dependencies

Navigate to the client directory and install all required dependencies:

```bash
cd client
npm install
```

### 2. Environment Variables

Create a `.env` file in the `client` directory with the following variables:

```env
VITE_SERVER_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3000
```

**Note:** Adjust these URLs based on your backend server configuration.

### 3. Run Development Server

Start the development server with hot module replacement:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

### 4. Build for Production

To create a production build:

```bash
npm run build
```

The optimized build will be output to the `dist` directory.

### 5. Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint to check code quality

## Project Structure

```
client/
├── src/
│   ├── api/                    # API client configuration
│   │   └── apiClient.ts        # Axios instance with interceptors
│   ├── assets/                 # Static assets (images, icons, etc.)
│   │   └── Loader.tsx
│   ├── components/            # React components
│   │   ├── Auth/              # Authentication components
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── EmailVerification.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── PublicRoute.tsx
│   │   ├── Dashboard/         # Dashboard components
│   │   │   ├── DashboardAnalytics.tsx
│   │   │   ├── ValidationFailureList.tsx
│   │   │   ├── ValidationFailureDetail.tsx
│   │   │   └── ValidationFailuresCard.tsx
│   │   ├── Documents/         # Document management components
│   │   │   ├── Step1IdentityUpload.tsx
│   │   │   ├── Step2DocumentsUpload.tsx
│   │   │   ├── Step3ReviewFields.tsx
│   │   │   ├── Step4GenerateDocument.tsx
│   │   │   ├── ExtractedFieldsGrid.tsx
│   │   │   ├── ExtractedFieldRow.tsx
│   │   │   └── MasterFieldsPanel.tsx
│   │   ├── Layout/            # Layout components
│   │   │   ├── Adminlayout.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   ├── MasterField/       # Master field components
│   │   │   └── MasterFieldTable.tsx
│   │   ├── Reusable/          # Reusable UI components
│   │   │   ├── Avatar.tsx
│   │   │   ├── AvatarGroup.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Form.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── Surface.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Toaster.tsx
│   │   │   └── Inputs/        # Form input components
│   │   │       ├── FileUpload.tsx
│   │   │       ├── ImageUpload.tsx
│   │   │       ├── MultiSelect.tsx
│   │   │       ├── OtpInput.tsx
│   │   │       ├── RichTextEditor.tsx
│   │   │       ├── Select.tsx
│   │   │       ├── TextArea.tsx
│   │   │       └── VideoUpload.tsx
│   │   ├── Static/            # Static pages
│   │   │   └── NotFoundPage.tsx
│   │   ├── Submissions/       # Submission management
│   │   │   ├── SubmissionsPage.tsx
│   │   │   └── SubmissionManagementPage.tsx
│   │   ├── TemplateMaker/    # Template designer
│   │   │   ├── TemplatesPage.tsx
│   │   │   ├── TemplateDesignerPage.tsx
│   │   │   ├── InspectorPanel.tsx
│   │   │   ├── PlacementBox.tsx
│   │   │   ├── components/
│   │   │   │   ├── PdfViewer.tsx
│   │   │   │   ├── ViewControls.tsx
│   │   │   │   ├── MasterFieldsPanel.tsx
│   │   │   │   └── KeyboardShortcutsHelp.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── usePdfViewer.ts
│   │   │   │   ├── useUndoRedo.ts
│   │   │   │   ├── useKeyboardShortcuts.ts
│   │   │   │   └── useClipboard.ts
│   │   │   └── utils/
│   │   │       └── placementUtils.ts
│   │   ├── Users/             # User management (Admin only)
│   │   │   └── UsersPage.tsx
│   │   └── charts/            # Chart components
│   │       ├── BarChartSimple.tsx
│   │       ├── DonutWorkloadChart.tsx
│   │       └── LineTrendChart.tsx
│   ├── constants/             # Application constants
│   │   ├── env.constants.ts
│   │   ├── language.constants.ts
│   │   └── theme.constants.ts
│   ├── context/               # React context providers
│   │   ├── AuthContext.tsx    # Authentication context
│   │   ├── ThemeContext.tsx   # Theme management (light/dark)
│   │   └── LanguageContext.tsx # Internationalization
│   ├── hooks/                 # Custom React hooks
│   │   └── useDashboardAnalytics.ts
│   ├── locales/               # Internationalization files
│   │   └── en.json
│   ├── redux/                 # Redux store and slices
│   │   ├── store.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── forgotPasswordSlice.ts
│   │       ├── logoutSlice.ts
│   │       ├── otpEmailSlice.ts
│   │       ├── otpPasswordResetSlice.ts
│   │       ├── profileSlice.ts
│   │       ├── resetPasswordSlice.ts
│   │       └── toasterSlice.ts
│   ├── service/               # API service functions
│   │   ├── authService.ts
│   │   ├── userService.ts
│   │   ├── submissionService.ts
│   │   ├── templateService.ts
│   │   ├── masterFieldService.ts
│   │   ├── extractionService.ts
│   │   ├── submissionDocumentService.ts
│   │   ├── submissionFieldsStatusService.ts
│   │   ├── dashboardService.ts
│   │   └── auditTrailService.ts
│   ├── styles/                # Global styles
│   │   ├── themes.css
│   │   └── scrollbar.css
│   ├── types/                 # TypeScript type definitions
│   │   ├── auth.types.ts
│   │   ├── extraction.types.ts
│   │   ├── template.types.ts
│   │   ├── toaster.types.ts
│   │   └── node.types.ts
│   ├── utils/                 # Utility functions
│   │   ├── apiWrapper.ts
│   │   ├── cn.ts              # Tailwind class name utility
│   │   ├── date.ts            # Date formatting utilities
│   │   ├── errorHandler.ts   # Centralized error handling
│   │   ├── getDeviceId.ts
│   │   ├── iconSets.ts
│   │   └── userUtils.ts       # User/avatar utilities
│   ├── App.tsx                # Main application component
│   ├── main.tsx               # Application entry point
│   └── index.css              # Global CSS
├── public/                    # Public static files
├── index.html                 # HTML entry point
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
└── tailwind.config.js         # Tailwind CSS configuration
```

## Application Routes

### Public Routes (Unauthenticated)

- `/` - Login page
- `/register` - User registration
- `/email-verification` - Email verification with OTP
- `/forgot-password` - Password reset request

### Protected Routes (Authenticated)

All protected routes are under `/workspace` and require authentication:

- `/workspace/dashboard/analytics` - Dashboard with analytics and recent activity
- `/workspace/submissions` - List all submissions
- `/workspace/submissions/:id` - Submission management page with document upload and field review
- `/workspace/master-fields` - Master field management (Admin only)
- `/workspace/template-maker` - Template list page
- `/workspace/template-maker/:templateId/manage` - Template designer with PDF viewer
- `/workspace/users` - User management (Admin only)
- `/workspace/profile` - User profile page with profile picture upload and password change

## Key Features

### Authentication & Authorization

- **User Registration** - Email-based registration with email verification
- **Login/Logout** - JWT-based authentication with refresh tokens
- **Password Reset** - OTP-based password reset flow
- **Profile Management** - Update profile information, upload profile picture, change password
- **Role-Based Access Control** - Admin, Agent, and Viewer roles with different permissions

### Document Management

- **CNIC Extraction** - Upload CNIC and extract name automatically
- **Document Upload** - Upload multiple documents for field extraction
- **Field Extraction** - AI-powered text extraction from documents
- **Field Review** - Review and correct extracted fields with validation
- **Document Generation** - Generate PDF documents from templates

### Template Designer

- **Template Creation** - Upload PDF templates and design field placements
- **Visual Designer** - Drag-and-drop interface for placing fields on templates
- **PDF Viewer** - Interactive PDF viewer with zoom and navigation
- **Keyboard Shortcuts** - Efficient template design workflow
- **Undo/Redo** - Template editing history

### Master Fields

- **Field Definitions** - Centralized field definitions with validation rules
- **Field Types** - Support for various field types (text, number, date, etc.)
- **Validation Rules** - Required/optional fields, format validation
- **CRUD Operations** - Create, read, update, and delete master fields (Admin only)

### Dashboard & Analytics

- **Summary Statistics** - Overview of submissions, documents, and validation status
- **Trends** - Time-based trends for submissions and validations
- **Validation Failures** - List of fields that failed validation
- **Workload Distribution** - Workload statistics across users
- **Recent Activity** - Audit trail of recent user actions

### User Management (Admin Only)

- **User List** - View all users with pagination and search
- **User CRUD** - Create, update, and delete users
- **Role Assignment** - Assign roles to users

### Audit Trail

- **Recent Activity** - Display recent audit logs on dashboard
- **Submission History** - View audit trail for specific submissions
- **Action Tracking** - Track template, master field, document, and field operations

## State Management

### React Context

- **AuthContext** - Global authentication state, user profile, and logout functionality
- **ThemeContext** - Theme management (light/dark mode)
- **LanguageContext** - Internationalization support

### Redux Toolkit

- **authSlice** - Authentication state (login, logout)
- **toasterSlice** - Toast notification management
- **profileSlice** - User profile state
- **OTP Slices** - Email verification and password reset OTP management

## Development Notes

- The app uses Redux Toolkit for state management
- API calls are handled through Axios with centralized configuration and error handling
- Tailwind CSS is used for styling with custom theme configuration
- TypeScript is strictly enforced for type safety
- ESLint is configured for code quality
- React Context API is used for global state (auth, theme, language)
- Profile pictures are managed through a reusable avatar system
- All user avatars are normalized and displayed consistently across the app

## Component Architecture

### Reusable Components

- **Form** - Dynamic form builder with validation
- **DataTable** - Paginated data table with sorting and filtering
- **Avatar** - User avatar with profile picture support
- **Modal** - Reusable modal component
- **Surface** - Card-like container component
- **StatusBadge** - Status indicator badges
- **PageHeader** - Consistent page headers

### Layout Components

- **AdminLayout** - Main application layout with sidebar and navbar
- **Navbar** - Top navigation with user menu and theme toggle
- **Sidebar** - Navigation sidebar with role-based menu items

## Styling

- **Tailwind CSS** - Utility-first CSS framework
- **Custom Themes** - Light and dark mode support
- **Responsive Design** - Mobile-friendly UI
- **Custom Scrollbars** - Styled scrollbars for better UX

## API Integration

All API calls are made through service functions in the `service/` directory:
- Centralized error handling
- Automatic token refresh
- Request/response interceptors
- Type-safe API calls with TypeScript

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically try the next available port. You can also specify a custom port:

```bash
npm run dev -- --port 3000
```

### Build Errors

If you encounter build errors:

1. Clear `node_modules` and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Check TypeScript errors:
   ```bash
   npx tsc --noEmit
   ```

3. Check ESLint errors:
   ```bash
   npm run lint
   ```

### Authentication Issues

If you're experiencing authentication issues:

1. Check that `VITE_BACKEND_URL` is correctly set in `.env`
2. Verify the backend server is running
3. Clear browser localStorage and cookies
4. Check browser console for API errors

### Profile Picture Not Showing

If profile pictures are not displaying:

1. Verify `VITE_BACKEND_URL` is correctly configured
2. Check that the backend file service is properly configured
3. Ensure user profile picture is properly uploaded
4. Check browser console for image loading errors

## Deployment

The client is configured for deployment on various platforms. For production:

1. Build the application: `npm run build`
2. Deploy the `dist` directory to your hosting service
3. Ensure environment variables are set in your hosting platform
4. Configure your hosting service to serve the SPA (Single Page Application) correctly

### Environment Variables for Production

Make sure to set:
- `VITE_SERVER_URL` - Backend server URL
- `VITE_BACKEND_URL` - Backend API URL

## Support

For issues or questions, please refer to the main project documentation or contact the development team.
