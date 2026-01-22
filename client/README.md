# Client - Mortgage Real Estate CRM

This is the frontend application for the Mortgage Real Estate CRM system, built with React, TypeScript, and Vite.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Redux Toolkit** - State management
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

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
│   ├── api/              # API client configuration
│   ├── assets/           # Static assets (images, icons, etc.)
│   ├── components/       # React components
│   │   ├── Auth/        # Authentication components
│   │   ├── Documents/   # Document management components
│   │   ├── Layout/      # Layout components (Navbar, Footer, etc.)
│   │   ├── MasterField/ # Master field components
│   │   ├── Reusable/    # Reusable UI components
│   │   ├── Static/      # Static pages
│   │   ├── Submissions/ # Submission management
│   │   └── TemplateMaker/ # Template designer
│   ├── constants/       # Application constants
│   ├── context/         # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── locales/         # Internationalization files
│   ├── redux/           # Redux store and slices
│   ├── service/         # API service functions
│   ├── styles/          # Global styles
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── public/              # Public static files
├── index.html           # HTML entry point
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── tailwind.config.js   # Tailwind CSS configuration
```

## Key Features

- **Authentication** - User registration, login, email verification, password reset
- **Document Management** - Upload, extract, and manage documents
- **Template Designer** - Create and manage document templates
- **Master Fields** - Manage field definitions
- **Submissions** - Track and manage document submissions
- **Responsive Design** - Mobile-friendly UI with Tailwind CSS

## Development Notes

- The app uses Redux Toolkit for state management
- API calls are handled through Axios with centralized configuration
- Tailwind CSS is used for styling with custom theme configuration
- TypeScript is strictly enforced for type safety
- ESLint is configured for code quality

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

## Deployment

The client is configured for deployment on Netlify (see `netlify.toml`). For other platforms:

1. Build the application: `npm run build`
2. Deploy the `dist` directory to your hosting service
3. Ensure environment variables are set in your hosting platform

## Support

For issues or questions, please refer to the main project documentation or contact the development team.
