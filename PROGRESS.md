# k03pr4Web-BE Authentication Implementation Progress

## Current Phase
Implementing two independent authentication flows for Retail Customers and Procurement Agents with separate sessions, token management, and route protection.

---

## Frontend Changes (k03pr4Web-FE)

### Login Page (`app/login/page.tsx`)
- Added segmented selector at top of login form: "Retail Customer" (default) and "Procurement Agent"
- Uses existing design system (same colors, Tailwind classes, lucide-react icons)
- `useSearchParams` bug fixed: `searchParams` is now properly obtained from `useSearchParams()` hook
- **Retail Customer Login**: Submits to `/login/`, stores `access` and `refresh` in localStorage, sets `access_token` cookie, redirects to `/`
- **Procurement Agent Login**: Submits to `/agent/login`, stores `agent_access_token` and `agent_refresh_token` in localStorage (never overwrites user token), sets `agent_access_token` cookie, redirects based on `verificationStatus`
- Development logging: all login attempts, successes, failures, and redirects are logged when `NODE_ENV === "development"`
- Friendly error messages for: invalid credentials, agent not found, agent not approved
- Wholescreen route protection already handled by Next.js middleware (`middleware.ts`)

### Middleware (`middleware.ts`)
- Already implements wholesale route protection
- Redirects retail users (with `access_token` but no `agent_access_token`) from `/wholesale/**` to home with toast
- Redirects to `/login?mode=agent` when no agent token is present
- Decodes JWT and checks `verificationStatus`:
  - `APPROVED` → allow access
  - `REJECTED` → redirect to `/agent/rejected`
  - `PENDING_VERIFICATION` / `PENDING_ORGANIZATION_APPROVAL` → redirect to `/agent/pending`
  - Token malformed → redirect to `/login?mode=agent`

### Agent Pending/Rejected Pages (already exist)
- `/agent/pending` - shows "Application Under Review" message
- `/agent/rejected` - shows "Application Not Approved" message
- Both pages have "Back to Login" links with `?mode=agent`

---

## Backend Changes (k03pr4Web-BE)

### AuthController (`src/controllers/auth.controller.ts`)
- **Existing**: `POST /login` (retail customer auth via CustomerAuthService) - unchanged
- **New**: `POST /agent/login` - authenticates against Agent table using same password hashing (bcrypt)
  - Validates email + password
  - Returns `{ accessToken, refreshToken, agent: { id, email, fullname, phone, verificationStatus, organizationId, agentType } }`
  - Development logging for login type, endpoint, email, success/failure, verification status, redirect destination
  - Never logs passwords or password hashes

### AuthService (`src/services/auth.service.ts`)
- **Existing**: All `AuthUser` methods, `authenticate()`, `requireUser()` - unchanged
- **New**: Agent authentication methods:
  - `createAgentTokens()` - generates JWT with `agent_id`, `organization_id`, `verification_status`, `agent_type`, `email`, `token_type`
  - `verifyAgentAccessToken()` - verifies agent tokens, checks `token_type === "access"`
  - `findAgentByEmail()` - queries Agent table by email (excluding deleted agents)
  - `requireAgent()` - middleware helper to attach agent to request from Authorization header
  - `authenticateAgent()` - main agent login: bcrypt.compareSync against `passwordHash`, returns tokens + agent payload

### AgentAuthGuard (`src/guards/agent-auth.guard.ts`)
- New guard that validates `agent_access_token` from `Authorization: Bearer <token>` header
- Checks token validity, agent existence, and `verificationStatus === "APPROVED"`
- Attaches `request.agent` to the request object for downstream handlers
- Throws user-friendly `BadRequestException` for all auth failures

### AppModule (`src/app.module.ts`)
- `AgentAuthGuard` imported and registered as a provider (used by WholesaleController via `@UseGuards`)

### WholesaleController (`src/controllers/wholesale.controller.ts`)
- Already has `@UseGuards(AgentAuthGuard)` applied
- All `/wholesale/**` routes now require APPROVED agent authentication

---

## Authentication Flow

### Retail Customer
1. User enters email & password
2. Frontend → `POST /login/` → CustomerAuthService
3. Backend verifies credentials against `api_user` table
4. Returns `{ access, refresh, user }`
5. Frontend stores `access` and `refresh` in localStorage + `access_token` cookie
6. Redirects to `/`
7. Retail users are blocked from `/wholesale/**` by middleware (redirects to home with toast)

### Procurement Agent
1. User selects "Procurement Agent" mode
2. User enters email & password
3. Frontend → `POST /agent/login` → AuthService.authenticateAgent()
4. Backend verifies credentials against `Agent` table using bcrypt
5. Returns `{ accessToken, refreshToken, agent: { id, email, fullname, phone, verificationStatus, organizationId, agentType } }`
6. Frontend stores `agent_access_token` in localStorage + cookie (never overwrites user tokens)
7. Frontend redirects based on `verificationStatus`:
   - `APPROVED` → `/wholesale/dashboard`
   - `PENDING_VERIFICATION` → `/agent/pending`
   - `PENDING_ORGANIZATION_APPROVAL` → `/agent/pending`
   - `REJECTED` → `/agent/rejected`
8. Wholesale routes check `agent_access_token` cookie via middleware
9. Middleware validates JWT and `verificationStatus`
10. Guard (`AgentAuthGuard`) validates token on each `/wholesale/**` request

---

## Session Management
- User and Agent tokens are **completely separate**:
  - User: `access`, `refresh` in localStorage + `access_token` cookie
  - Agent: `agent_access_token`, `agent_refresh_token` in localStorage + `agent_access_token` cookie
- A retail session never converts to an agent session and vice versa
- Clear auth action removes both token types separately

---

## Files Modified
### Backend (k03pr4Web-BE)
- `src/controllers/auth.controller.ts` - Added `POST /agent/login` endpoint
- `src/services/auth.service.ts` - Added agent authentication methods
- `src/guards/agent-auth.guard.ts` - NEW: AgentAuthGuard for wholesale protection
- `src/app.module.ts` - Added AgentAuthGuard provider

### Frontend (k03pr4Web-FE)
- `app/login/page.tsx` - Added segmented selector, agent/login flow, dev logging, fixed useSearchParams
- `middleware.ts` - Already had wholesale protection (unchanged)
- `app/agent/pending/page.tsx` - Already exists (unchanged)
- `app/agent/rejected/page.tsx` - Already exists (unchanged)

### Prisma
- No schema changes required (user and Agent remain separate models)

---

## Known Issues
- `prisma db pull` could not be run (database server at localhost:5433 not available) - schema is unchanged so this is expected
- The `AgentAuthGuard` uses `request.agent` property which is a plain property attachment - in production, consider using NestJS `ExecutionContext.switchToHttp().getRequest()` typing

---

## Next Steps
1. Run database migrations if Agent schema changes are needed
2. Add agent logout endpoint (`POST /agent/logout`) that clears tokens
3. Add agent token refresh endpoint
4. Set up `.env` variables for `JWT_SECRET` if not already configured
5. Test full authentication flow end-to-end with both user and agent accounts
6. Add rate limiting specifically for `/agent/login` endpoint (currently uses general throttle)
