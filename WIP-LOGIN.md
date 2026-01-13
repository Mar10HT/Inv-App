# WIP: Login & Authentication Implementation

> **Status**: In Progress
> **Last Updated**: January 9, 2026
> **This file is disposable and will be deleted once the feature is complete**

---

## Current State Analysis

### Frontend (Angular)
- [x] User interface exists (`user.interface.ts`)
- [x] UserService with CRUD operations
- [x] Roles defined: `ADMIN`, `USER`, `VIEWER`, `EXTERNAL`
- [x] Profile page exists (but uses mock data)
- [ ] No login page
- [ ] No AuthService
- [ ] No route guards
- [ ] No token handling
- [ ] No HTTP interceptor for auth headers

### Backend (NestJS - separate repo: Inv-App-API)
- [x] User CRUD endpoints exist
- [ ] No auth endpoints (`/auth/login`, `/auth/register`)
- [ ] No JWT implementation
- [ ] No password hashing (bcrypt)
- [ ] No token validation middleware

---

## Implementation Plan

### Phase 1: Frontend - Login Page & Auth Service

#### 1.1 Create Auth Service
```
src/app/services/auth.service.ts
```
- `login(email, password)` - POST /api/auth/login
- `logout()` - Clear token and redirect
- `isAuthenticated()` - Check if user has valid token
- `getCurrentUser()` - Get current user from token/API
- `getToken()` - Get stored token
- Signal: `currentUser`, `isLoggedIn`

#### 1.2 Create Login Component
```
src/app/components/auth/login/
  - login.ts
  - login.html
  - login.css
```
- Email input with validation
- Password input with validation
- "Remember me" checkbox (optional)
- Error messages display
- Loading state
- Redirect to dashboard on success

#### 1.3 Create Auth Guard
```
src/app/guards/auth.guard.ts
```
- Protect routes that require authentication
- Redirect to login if not authenticated
- Role-based guards (admin-only routes)

#### 1.4 Create HTTP Interceptor
```
src/app/interceptors/auth.interceptor.ts
```
- Add Authorization header to requests
- Handle 401 errors (redirect to login)
- Handle token refresh (optional)

#### 1.5 Update Routes
```typescript
// Add login route (public)
{ path: 'login', loadComponent: () => import('./components/auth/login/login').then(m => m.Login) }

// Add guards to protected routes
{ path: 'dashboard', canActivate: [authGuard], loadComponent: ... }
```

### Phase 2: Backend - Auth Endpoints (NestJS)

#### 2.1 Install Dependencies
```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/bcrypt @types/passport-jwt
```

#### 2.2 Create Auth Module
```
api/src/auth/
  - auth.module.ts
  - auth.controller.ts
  - auth.service.ts
  - jwt.strategy.ts
  - jwt-auth.guard.ts
```

#### 2.3 Endpoints to Create
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password, returns JWT |
| POST | `/api/auth/register` | Register new user (admin only?) |
| GET | `/api/auth/me` | Get current user from token |
| POST | `/api/auth/logout` | Invalidate token (optional) |
| POST | `/api/auth/refresh` | Refresh token (optional) |

#### 2.4 Update User Model
- Hash password before save (bcrypt)
- Remove password from responses
- Add `lastLogin` field (optional)

---

## API Improvements Needed

### Security
- [ ] Hash passwords with bcrypt (salt rounds: 10)
- [ ] Never return password in responses
- [ ] Implement JWT with expiration (1h access, 7d refresh)
- [ ] Add rate limiting on auth endpoints
- [ ] Validate email format on registration

### Data Validation
- [ ] Add class-validator decorators
- [ ] Validate all DTOs
- [ ] Add proper error messages

### Error Handling
- [ ] Standardize error responses
- [ ] Add proper HTTP status codes
- [ ] Create custom exceptions

### Database
- [ ] Add indexes on frequently queried fields
- [ ] Add unique constraint on email
- [ ] Add soft delete for users

---

## File Structure After Implementation

```
src/app/
├── components/
│   └── auth/
│       └── login/
│           ├── login.ts
│           ├── login.html
│           └── login.css
├── services/
│   └── auth.service.ts      (NEW)
├── guards/
│   └── auth.guard.ts        (NEW)
├── interceptors/
│   └── auth.interceptor.ts  (NEW)
└── interfaces/
    └── auth.interface.ts    (NEW)
```

---

## Translation Keys to Add

### en.json
```json
{
  "AUTH": {
    "LOGIN": "Login",
    "LOGOUT": "Logout",
    "EMAIL": "Email",
    "PASSWORD": "Password",
    "REMEMBER_ME": "Remember me",
    "FORGOT_PASSWORD": "Forgot password?",
    "NO_ACCOUNT": "Don't have an account?",
    "REGISTER": "Register",
    "LOGIN_SUCCESS": "Login successful",
    "LOGIN_ERROR": "Invalid email or password",
    "SESSION_EXPIRED": "Session expired, please login again"
  }
}
```

### es.json
```json
{
  "AUTH": {
    "LOGIN": "Iniciar Sesión",
    "LOGOUT": "Cerrar Sesión",
    "EMAIL": "Correo Electrónico",
    "PASSWORD": "Contraseña",
    "REMEMBER_ME": "Recordarme",
    "FORGOT_PASSWORD": "¿Olvidaste tu contraseña?",
    "NO_ACCOUNT": "¿No tienes cuenta?",
    "REGISTER": "Registrarse",
    "LOGIN_SUCCESS": "Inicio de sesión exitoso",
    "LOGIN_ERROR": "Correo o contraseña inválidos",
    "SESSION_EXPIRED": "Sesión expirada, por favor inicia sesión nuevamente"
  }
}
```

---

## Progress Tracking

### Frontend
- [ ] Create `auth.interface.ts`
- [ ] Create `auth.service.ts`
- [ ] Create login component
- [ ] Create auth guard
- [ ] Create auth interceptor
- [ ] Update routes with guards
- [ ] Add translations
- [ ] Update navigation (show/hide based on auth)
- [ ] Connect Profile page to real user
- [ ] Test login flow

### Backend (If needed)
- [ ] Create auth module
- [ ] Implement JWT strategy
- [ ] Create login endpoint
- [ ] Add password hashing
- [ ] Add auth guard to protected routes
- [ ] Test endpoints

---

## Notes

- The backend is in a separate repository: `Inv-App-API`
- Using NestJS with Prisma and SQLite (dev) / PostgreSQL (prod)
- JWT tokens stored in localStorage (consider httpOnly cookies for production)
- Role-based access: ADMIN has full access, VIEWER is read-only

---

## Next Steps

1. Start with frontend auth service and login page
2. Check if backend has auth endpoints, if not implement them
3. Add guards to all protected routes
4. Test complete flow
