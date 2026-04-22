# Vigilancia Pro - Agent Instructions

## Project Overview

**Vigilancia Pro** is a fullstack visitor entry management system. Security guards (vigilantes) log guests entering apartments with vehicle info, visit type, and identification. The system maintains an audit trail in Supabase and displays history via a web dashboard.

- **Type**: Fullstack monorepo (React frontend + Node.js serverless backend)
- **Deployment**: Single Vercel deployment, unified build from root
- **Database**: Supabase (PostgreSQL + Auth + RLS)

---

## Tech Stack

### Frontend
- **React 19.2.5** + **React Router 7** (client-side routing)
- **Vite 8** (build tool, dev server)
- **TailwindCSS 3.4** (styling)
- **Supabase JS 2.104** (auth & realtime client)
- **ESLint 9** (code quality)

### Backend
- **Node.js ES modules** (no framework)
- **Vercel Serverless Functions** (handlers in /api/ folders)
- **Supabase JS 2.104** (admin client)

### Database & Auth
- **Supabase** (PostgreSQL, Auth, Row-Level Security)
- Schema: ingresos table with RLS policies

---

## Build & Run Commands

### Development
`ash
npm install                    # Install all dependencies (monorepo)
npm run dev:frontend           # Start frontend dev server (localhost:5173)
vercel dev                     # Start both frontend + backend
npm run lint                   # Lint frontend code
`

### Production Build
`ash
npm run build                  # Build frontend (output: frontend/dist)
vercel                         # Deploy to Vercel staging
vercel --prod                  # Deploy to Vercel production
`

**Node Version**: >= 20 required

---

## Architecture

### Folder Structure
`
vigilancia_pro/
├── frontend/                               # React + Vite
│   ├── src/
│   │   ├── App.jsx                         # Router setup, PrivateRoute wrapper
│   │   ├── main.jsx                        # React entry (renders App + AuthProvider)
│   │   ├── context/AuthContext.jsx         # Auth state (user, vigilanteName, logout)
│   │   ├── pages/
│   │   │   ├── Login/Login.jsx             # Authentication page
│   │   │   ├── Dashboard/Dashboard.jsx     # Home dashboard
│   │   │   ├── Ingresos/Ingresos.jsx       # Form to log visitor entry
│   │   │   └── Historial/Historial.jsx     # View all past entries (table)
│   │   ├── services/api.js                 # HTTP client (auto-attaches Bearer token)
│   │   └── utils/ingresos.js               # Helper functions
│   └── vite.config.js                      # Vite config (React plugin, /api proxy)
│
├── backend/                                # Vercel serverless functions
│   ├── api/ingresos/index.js              # GET (fetch entries), POST (create entry)
│   ├── lib/supabaseClient.js              # Admin Supabase client (singleton)
│   ├── services/ingresosService.js        # Business logic (queries, inserts)
│   └── utils/
│       ├── auth.js                        # verifyUser(token) - JWT validation
│       └── response.js                    # HTTP response formatting
│
├── create_ingresos_table.sql              # Database migration
├── vercel.json                            # Vercel config (functions, rewrites)
└── package.json                           # Root monorepo config
`

### API Endpoints
| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| /api/ingresos | GET | Fetch all entries (desc by date) | Bearer token |
| /api/ingresos | POST | Create new entry | Bearer token |

### Routes (React Router v7)
| Route | Component | Auth Required |
|-------|-----------|---|
| / | Login | No |
| /dashboard | Dashboard | Yes |
| /ingresos | Ingresos (Entry Form) | Yes |
| /historial | Historial (History) | Yes |

---

## Code Conventions

### File & Naming
- **Components**: PascalCase (e.g., Login.jsx, Dashboard.jsx)
- **Services/Utils**: camelCase (e.g., supabaseClient.js, api.js)
- **Folders**: PascalCase for pages (/pages/Login/), camelCase for utilities (/services/)
- **Database columns**: snake_case (e.g., apartamento_destino, fecha_ingreso)
- **Variables**: camelCase (e.g., sessionUser, ingresoData)

### Code Style
- **ES Modules only** (import/export, no CommonJS)
- **React Hooks** (functional components only, useState, useContext, useCallback)
- **No class components**
- **Error handling**: Try-catch blocks, user-friendly error messages
- **Validation**: Schema checks in backend API handlers

### Styling
- **TailwindCSS utility classes** for all styles
- **Custom CSS**: BEM-like naming (e.g., .login-card__icon)
- **PostCSS** with Autoprefixer

---

## Key Files

**Frontend Entry Points**:
- frontend/src/main.jsx - React root
- frontend/src/App.jsx - Router setup
- frontend/src/context/AuthContext.jsx - Auth state management
- frontend/src/services/api.js - HTTP client (auto-includes Bearer token)
- frontend/src/pages/Ingresos/Ingresos.jsx - Entry form

**Backend**:
- backend/api/ingresos/index.js - Main API handler (GET/POST)
- backend/utils/auth.js - Token verification (verifyUser)
- backend/services/ingresosService.js - Database queries
- backend/lib/supabaseClient.js - Admin Supabase instance

**Configuration**:
- vercel.json - Vercel deploy config
- vite.config.js - Vite config (dev proxy for /api)
- tailwind.config.js - TailwindCSS config
- create_ingresos_table.sql - Database schema (apply in Supabase)

---

## Common Pitfalls & Troubleshooting

### Missing Environment Variables
**Symptom**: "Faltan variables de entorno..." or request failures

**Fix**: Set these in Vercel project settings (or local .env files):
- VITE_SUPABASE_URL (frontend)
- VITE_SUPABASE_ANON_KEY (frontend - public key)
- SUPABASE_URL (backend)
- SUPABASE_SERVICE_ROLE_KEY (backend - admin key, server-only!)

### Database Schema Not Found
**Symptom**: "La tabla public.ingresos no existe..."

**Fix**:
1. Open Supabase SQL Editor
2. Run create_ingresos_table.sql
3. Execute: NOTIFY pgrst, 'reload schema';
4. Restart backend

### Dev Proxy Not Working
**Symptom**: /api requests return 404

**Fix**: 
- Frontend must run on localhost:5173
- Backend must run on localhost:3001 (configured in vite.config.js)
- Use: npm run dev:frontend or vercel dev

### Token Validation Fails
**Symptom**: 401 Unauthorized from API

**Fix**:
- frontend/src/services/api.js auto-adds Bearer token
- Verify token isn't expired (checked in backend/utils/auth.js)
- Ensure auth context is properly initialized

---

## Environment Setup

### Local Development
1. npm install
2. Create frontend/.env.local:
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key

3. Create backend/.env:
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

4. Start development:
   npm run dev:frontend
   (or use: vercel dev for full stack)

5. Apply database schema:
   - Open Supabase SQL Editor
   - Run create_ingresos_table.sql

### Deployment to Vercel
1. Link repository: vercel link
2. Set environment variables in Vercel project settings
3. Deploy: vercel --prod

---

## Important Implementation Details

### Supabase Client Patterns
- **Frontend**: Uses anon key (public, safe for browser)
- **Backend**: Uses service role key (admin, server-side only)
- **Singleton pattern**: Backend reuses client instance per request

### React Patterns
- Auth state via **React Context** (no Redux)
- **PrivateRoute wrapper** in App.jsx for protected routes
- **useContext** hook to access auth in components
- **useCallback** for memoized handlers

### Error Messages
- Returned as JSON: { error: "message" }
- Frontend displays to user in UI
- Include specific details for debugging

### Row-Level Security (RLS)
- Ingresos table has RLS enabled
- Policies enforce: users see/create only their own entries
- Backend uses service role key to bypass RLS for admin reads

---

## Quick Reference: When to Modify Which Files

| Task | File(s) |
|------|---------|
| Add new page | frontend/src/pages/, update App.jsx routes |
| Add new API endpoint | backend/api/[endpoint]/index.js |
| Modify auth logic | backend/utils/auth.js, AuthContext.jsx |
| Change database schema | create_ingresos_table.sql (apply in Supabase) |
| Update styling | Use TailwindCSS classes; avoid new CSS files |
| Add npm package | package.json (root or specific workspace) |
| Configure deployment | vercel.json |
| Debug API locally | Check vite.config.js dev proxy settings |

---

## Resources

- Supabase Docs: https://supabase.com/docs
- React Router v7: https://reactrouter.com/
- Vite: https://vitejs.dev/
- TailwindCSS: https://tailwindcss.com/
- Vercel: https://vercel.com/docs
