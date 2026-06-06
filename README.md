# CareerCode Academy 🎓

Welcome to the **CareerCode Academy** repository! This is a comprehensive e-learning platform that empowers instructors to create, manage, and sell courses, while giving students a highly engaging learning experience.

## ✨ Features

- **Authentication & Authorization**: Secure JWT-based auth with bcrypt hashing and Role-Based Access Control (RBAC). Three distinct roles: `student`, `instructor`, and `admin`.
- **Student Dashboard**: Track course progress, manage assignments, earn certificates, and view real-time notifications.
- **Instructor Portal**: Easily apply to become an instructor, and if approved, get access to tools for managing courses, grading assignments, tracking students, and handling revenue.
- **Admin Review System**: A powerful dashboard for platform administrators to review instructor applications, manage existing users, track global revenue analytics, and oversee course content.
- **Modern UI**: A responsive, fully interactive frontend built with React, Tailwind CSS, Framer Motion, and Lucide React icons.
- **PostgreSQL Database**: Solid data integrity utilizing the `pg` driver for interactions with a PostgreSQL database.

## 🚀 Tech Stack

### Frontend
- **React 18** with **TypeScript**
- **Vite** (for blazingly fast builds)
- **Tailwind CSS** (for styling)
- **Framer Motion** (for micro-animations and page transitions)
- **Zustand** (for lightweight global state management)
- **React Router v6** (for routing)

### Backend
- **Node.js** & **Express**
- **TypeScript**
- **PostgreSQL** (with `pg` module)
- **JWT** (JSON Web Tokens for Auth)
- **Bcryptjs** (for password hashing)
- **Multer** (for handling multipart file uploads like resumes and profile pictures)

## 📦 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/en/) (v16+)
- [PostgreSQL](https://www.postgresql.org/) (Running locally or via a cloud provider)

### 1. Database Setup
1. Create a PostgreSQL database (e.g., `careercode`).
2. Run the `create_table.js` script to bootstrap the required schema.

### 2. Backend Setup
1. Navigate to the `backend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and populate your database URI, JWT secrets, etc.
4. Start the backend development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

The application will now be running at `http://localhost:5173` (Frontend) and `http://localhost:3000` (Backend).

## 🗂 Project Structure

```text
CareerCode-Academy/
├── backend/
│   ├── src/
│   │   ├── config/       # DB configuration, Mailer config
│   │   ├── middleware/   # Auth logic, Multer upload logic
│   │   ├── models/       # Database interactions (User, Course, Application)
│   │   ├── routes/       # Express API routes
│   │   ├── utils/        # Helper functions
│   │   └── index.ts      # App entry point
│   └── create_table.js   # DB Migration Script
└── frontend/
    ├── src/
    │   ├── components/   # Reusable UI components (Buttons, Modals, Navbar)
    │   ├── hooks/        # Custom React hooks
    │   ├── lib/          # Axios setup, Utility functions
    │   ├── pages/        # Route pages (Home, Login, Admin Dashboard, etc.)
    │   └── store/        # Zustand state stores
    └── index.html
```

## 🔐 Accounts & Roles
- **Student**: Default account upon registering. Can browse and enroll in courses.
- **Instructor**: Granted automatically when an admin approves an application submitted at `/become-an-instructor`. Gains access to the Instructor Dashboard.
- **Admin**: Has ultimate oversight over the platform, applications, and revenue.

---
*Built with ❤️ for aspiring developers.*
