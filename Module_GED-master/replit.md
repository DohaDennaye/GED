# Document Management System - replit.md

## Overview

This is a modern, full-stack document management system built for ERP environments. The application provides comprehensive document handling capabilities with a React frontend, Express.js backend, and PostgreSQL database. It features a sophisticated folder structure system, advanced search capabilities, and secure document sharing mechanisms.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API design
- **File Handling**: Multer for multipart/form-data processing
- **Development**: Hot reload with Vite integration in development mode

### Database Architecture
- **Database**: PostgreSQL with Neon serverless connections
- **ORM**: Drizzle ORM for type-safe database operations
- **Migration**: Drizzle Kit for schema migrations
- **Connection**: Connection pooling with @neondatabase/serverless

## Key Components

### Database Schema
- **Users**: Authentication and user management with role-based access
- **Folders**: Hierarchical folder structure with path-based organization
- **Documents**: File metadata with versioning and tagging support
- **Permissions**: Granular document and folder access control
- **Activity Logging**: Comprehensive audit trail for all operations
- **Document Sharing**: Secure sharing mechanisms with expiration dates

### Document Management Features
- **File Upload**: Multi-file upload with drag-and-drop support
- **File Types**: Support for PDF, Office documents, images, and archives
- **Versioning**: Document version control with parent-child relationships
- **Tagging**: Multi-tag system for flexible organization
- **Search**: Advanced search with filtering by type, status, dates, and tags
- **Preview**: In-browser document preview capabilities

### Folder System
- **Hierarchical Structure**: Nested folder organization with path tracking
- **Folder Types**: Standard, smart (rule-based), and secure folders
- **Permissions**: Folder-level access control with inheritance
- **Templates**: Predefined folder structures for common workflows

### Security Features
- **Role-Based Access**: Admin, user, and viewer roles
- **Document Permissions**: Fine-grained access control per document
- **Secure Sharing**: Time-limited sharing with access tracking
- **Activity Logging**: Complete audit trail for compliance

## Data Flow

1. **Authentication**: User authentication establishes session context
2. **Folder Navigation**: Client fetches folder structure and navigates hierarchy
3. **Document Operations**: CRUD operations on documents with permission checks
4. **File Storage**: Files stored on filesystem with metadata in database
5. **Search & Filter**: Real-time search with backend filtering and pagination
6. **Activity Tracking**: All operations logged for audit purposes

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI primitive components
- **multer**: File upload handling
- **date-fns**: Date manipulation utilities

### Development Dependencies
- **Vite**: Build tool and development server
- **TypeScript**: Type safety and enhanced developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing with autoprefixer

### UI Components
- Comprehensive shadcn/ui component library
- Radix UI primitives for accessibility
- Lucide React icons for consistent iconography

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment designation (development/production)
- **File Storage**: Local filesystem storage in `uploads/` directory

### Production Deployment
- Single-command build process combining frontend and backend
- Static file serving integrated with Express server
- Database migrations handled separately from application deployment

### Development Workflow
- Hot reload for both frontend and backend code
- Integrated development server with proxy configuration
- TypeScript compilation and error checking

## Changelog

```
Changelog:
- July 02, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```