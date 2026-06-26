# iART-HRMS Frontend

## 📋 Project Overview

**iART-HRMS** (Integrated Applicant and Resource Tracking - Human Resource Management System) is a comprehensive HR management platform built with modern web technologies. The frontend provides a responsive and intuitive interface for managing employee information, attendance, leave requests, and organizational data.

### Project Type
- **Application**: HR Management System
- **Frontend Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.7
- **Package Manager**: npm/yarn
- **Node Version**: Compatible with Node 16+

---

## ✨ Key Features

### 👤 User Management
- Admin user management interface
- Add/edit/delete employee records
- User role-based access control (Admin & Employee)
- User profile and account management
- Batch user operations

### 📅 Attendance Management
- Mark attendance with timestamps
- Daily attendance tracking
- Monthly attendance reports
- Admin attendance overview and corrections
- Attendance filtering and analytics
- Visual attendance calendar view

### 🏖️ Leave Management
- Submit leave requests with reasons
- Leave approval workflow
- Leave balance tracking
- Leave history and reports
- Multiple leave status (pending, approved, rejected)
- Leave action menu (approve/reject/view details)

### 📊 Dashboard
- Employee dashboard with key metrics
- Admin dashboard with system overview
- Monthly attendance statistics
- Leave status overview
- Quick action cards
- Real-time data updates

### 📞 Phone Book
- Centralized employee directory
- Contact information management
- Search and filter capabilities
- Employee contact cards

### 🗓️ Calendar & Holidays
- Organization calendar view
- Holiday management
- Weekend generation
- Event visualization

### 🔐 Authentication
- Secure login/logout
- Token-based authentication (JWT)
- Protected routes with role-based access
- Auto-logout on token expiration
- Persistent session management

---

## 🛠️ Tech Stack

### Core Dependencies
```json
{
  "react": "^19.1.1",
  "react-dom": "^19.1.1",
  "react-router-dom": "^7.9.5",
  "axios": "^1.13.1"
}
```

### UI & Styling
- **Material-UI (MUI)**: ^7.3.5 - Comprehensive component library
- **Tailwind CSS**: ^4.1.16 - Utility-first CSS framework
- **Emotion**: ^11.14.0 & ^11.14.1 - CSS-in-JS styling solution
- **Lucide React**: ^0.552.0 - Icon library

### Data Visualization & Utilities
- **Recharts**: ^3.3.0 - Data visualization/charting
- **Moment.js**: ^2.30.1 - Date/time manipulation
- **React Toastify**: ^11.0.5 - Toast notifications

### Development Tools
- **Vite Plugins**: React integration with Fast Refresh
- **ESLint**: ^9.36.0 - Code quality & linting
- **TypeScript Support**: Types for React & React-DOM

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── api/                          # API integration layer
│   │   ├── attendaceApi.js           # Attendance API endpoints
│   │   ├── authApi.js                # Authentication endpoints
│   │   ├── calendarApi.js            # Calendar/holiday endpoints
│   │   ├── leaveApi.js               # Leave management endpoints
│   │   └── axiosInstance.js          # Axios configuration
│   │
│   ├── components/                   # Reusable React components
│   │   ├── AddEditUserModal.jsx      # User add/edit modal
│   │   ├── AdminUserFilterModal.jsx  # User filtering component
│   │   ├── AttendanceActionsMenu.jsx # Attendance action controls
│   │   ├── AttendanceCard.jsx        # Attendance display card
│   │   ├── CalendarComponent.jsx     # Calendar UI component
│   │   ├── CalendarModal.jsx         # Calendar interaction modal
│   │   ├── ConfirmDeleteModal.jsx    # Confirmation dialog
│   │   ├── CustomHeader.jsx          # Custom header component
│   │   ├── CustomTable.jsx           # Reusable data table
│   │   ├── DashboardCard.jsx         # Dashboard card component
│   │   ├── DashboardCardSecondary.jsx # Secondary dashboard card
│   │   ├── EditAttendanceModal.jsx   # Edit attendance modal
│   │   ├── FilterModal.jsx           # Generic filter modal
│   │   ├── GenerateWeekendsModal.jsx # Weekend generation modal
│   │   ├── LeaveActionMenu.jsx       # Leave action controls
│   │   ├── LeaveForm.jsx             # Leave request form
│   │   ├── Loader.jsx                # Loading spinner component
│   │   ├── PhoneBookCard.jsx         # Phone book card
│   │   ├── PortalMenu.jsx            # Portal menu navigation
│   │   ├── RejectModal.jsx           # Rejection dialog
│   │   ├── SideBar.jsx               # Navigation sidebar
│   │   ├── UserActionsMenu.jsx       # User action menu
│   │   ├── UserDetailsModal.jsx      # User details dialog
│   │   ├── upcomingHolidaysCard.jsx  # Holidays display card
│   │   ├── leaveColumns.jsx          # Leave table columns config
│   │   └── dummyUsers.js             # Mock user data
│   │
│   ├── context/                      # React Context for state management
│   │   └── AuthContext.jsx           # Authentication context
│   │
│   ├── pages/                        # Page components (routes)
│   │   ├── Account.jsx               # User account page
│   │   ├── AdminAttendance.jsx       # Admin attendance management
│   │   ├── AdminAttendanceReport.jsx # Attendance reports admin view
│   │   ├── AdminDashboard.jsx        # Admin dashboard
│   │   ├── AdminMonthlyAttendance.jsx # Monthly attendance view
│   │   ├── AdminUsersPage.jsx        # User management page
│   │   ├── AttendanceReport.jsx      # Employee attendance report
│   │   ├── Calendar.jsx              # Calendar page
│   │   ├── Dashboard.jsx             # Employee dashboard
│   │   ├── Layout.jsx                # Main layout wrapper
│   │   ├── LeaveManagement.jsx       # Leave management page
│   │   ├── Login.jsx                 # Authentication page
│   │   └── PhoneBookPage.jsx         # Phone directory page
│   │
│   ├── routes/                       # Route configuration & guards
│   │   ├── DashboardRouter.jsx       # Dashboard routing logic
│   │   ├── RoleRoute.jsx             # Role-based route guards
│   │   └── RouteGuard.jsx            # Protected route wrapper
│   │
│   ├── assets/                       # Static assets (images, fonts, etc.)
│   ├── App.jsx                       # Root application component
│   ├── main.jsx                      # Vite entry point
│   └── index.css                     # Global styles
│
├── public/                           # Static files served as-is
├── package.json                      # Dependencies & scripts
├── vite.config.js                    # Vite configuration
├── eslint.config.js                  # ESLint rules
├── index.html                        # HTML entry point
└── README.md                         # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16.0.0 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd iART-HRMS/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   - Create a `.env` file in the project root (if needed)
   - Add API base URL and other configuration

3. **Example `.env` (do NOT commit credentials)**

```env
VITE_API_URL=your_api_url/your_backend_url
```

### Development

**Start the development server**
```bash
npm run dev
# or
yarn dev
```
- Opens at `http://localhost:5173` (Vite default)
- Hot Module Replacement (HMR) enabled for instant updates

### Production Build

**Build for production**
```bash
npm run build
# or
yarn build
```
- Optimized bundle created in `dist/` directory
- Ready for deployment

**Preview production build locally**
```bash
npm run preview
# or
yarn preview
```

---

## 📦 Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `npm run dev` | Start development server with HMR |
| `build` | `npm run build` | Create optimized production build |
| `preview` | `npm run preview` | Preview production build locally |
| `lint` | `npm run lint` | Run ESLint to check code quality |

---

## 🔐 Authentication & Security

### Authentication Flow
1. User logs in with credentials via `/` (Login page)
2. Backend validates and returns JWT token
3. Token stored in localStorage
4. Token included in all API requests via axios interceptor
5. Protected routes validated via `PrivateRoute` wrapper

### Authorization
- **Role-based Access Control (RBAC)**
  - `AdminRoute`: Restricted to admin users
  - `EmployeeRoute`: Restricted to employee users
  - `PublicRoute`: Accessible only when logged out
  - `PrivateRoute`: Requires valid authentication

### Protected Routes
- `/dashboard` - Dashboard (role-based content)
- `/leave` - Leave management
- `/account` - Account settings
- `/attendance` - Attendance tracking
- `/admin/*` - Admin-only pages

---

## 📡 API Integration

### Axios Configuration
- **Base URL**: Configured in `src/api/axiosInstance.js`
- **Interceptors**: Automatic token injection, error handling
- **Timeout**: Standard HTTP timeout settings

### API Modules
1. **authApi.js** - Login, logout, user verification
2. **attendaceApi.js** - Mark attendance, fetch records, reports
3. **leaveApi.js** - Submit, approve, reject leave requests
4. **calendarApi.js** - Fetch holidays, generate weekends

---

## 🎨 Styling Approach

### Tailwind CSS
- Utility-first approach for responsive design
- Mobile-first design methodology
- Custom breakpoints and theme customization

### Material-UI (MUI)
- Pre-built components (buttons, modals, tables, etc.)
- Consistent design system
- Emotion integration for style customization

### Custom CSS
- `index.css` for global styles
- Component-scoped styling with Emotion
- Tailwind utility classes for rapid development

---

## 🧩 State Management

### React Context API
- **AuthContext**: Manages user authentication state, token, login/logout
- Centralized state for user data
- Easy access via `useAuth()` custom hook

### Local Component State
- useState for component-level state
- useEffect for side effects and data fetching

---

## ⚠️ Error Handling

- Toast notifications via React Toastify for user feedback
- API error handling in axios interceptors
- Graceful fallbacks for failed requests
- Validation on forms before submission

---

## 📈 Performance Optimizations

- **Vite**: Ultra-fast build tool with optimized bundling
- **React Fast Refresh**: Instant HMR without state loss
- **Code Splitting**: Lazy loading of routes via React Router
- **Tree Shaking**: Removal of unused dependencies
- **Image Optimization**: Lucide icons (SVG-based, lightweight)

---

## 🔍 Code Quality

### ESLint Configuration
- Enforces consistent code style
- React-specific rules enabled
- React Hooks best practices validation

**Run linter:**
```bash
npm run lint
```

---

## 🐛 Common Issues & Solutions

### Issue: Port 5173 already in use
**Solution:** Specify a different port in vite.config.js or use:
```bash
npm run dev -- --port 3000
```

### Issue: CORS errors with API calls
**Solution:** Ensure API base URL is correct in `.env` and backend CORS is configured

### Issue: Token expired
**Solution:** User will be auto-logged out; refresh page or login again

---

## 📚 Resources & Documentation

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [React Router](https://reactrouter.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Material-UI](https://mui.com)
- [Axios Documentation](https://axios-http.com)

---

## 📝 License

This project is part of the iART-HRMS system. All rights reserved.

---

## 👥 Team

**iART-HRMS Frontend Team**

For questions or support, please contact the development team.

---

## 🗓️ Version History

- **v0.0.0** - Initial frontend development
  - Core HR features implemented
  - Authentication system in place
  - Role-based access control
  - Dashboard & reporting features

---

**Last Updated**: June 2026  
**Status**: Active Development
