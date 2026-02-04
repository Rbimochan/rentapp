# 🔧 RentApp Task Checklist

**Status**: In Progress  
**Last Updated**: 2026-02-04

---

## 🔴 **CRITICAL SECURITY FIXES** (Priority 1)

### ✅ Task 1: Fix JWT Verification in authMiddleware.ts
- **Status**: 🟡 In Progress
- **Issue**: Currently using `jwt.decode()` which doesn't verify JWT signature
- **Fix**: Switch to `jwt.verify()` with AWS Cognito public keys
- **Files**: `server/src/middleware/authMiddleware.ts`
- **Labels**: `critical`, `security`

### ⬜ Task 2: Add Environment Variable Validation
- **Status**: 📋 To Do
- **Issue**: Missing .env.example and runtime validation
- **Fix**: 
  - Create `.env.example` with required variables
  - Add Zod schema for env validation in `server/src/index.ts`
  - Document all required AWS Cognito, Oracle DB, and S3 variables
- **Files**: 
  - `server/.env.example` (new)
  - `server/src/config/env.ts` (new)
- **Labels**: `devops`, `security`

---

## 🟡 **DATABASE MIGRATION** (Priority 2)

### ⬜ Task 3: Oracle DB Integration Planning
- **Status**: 📋 To Do
- **Issue**: Migrating from PostgreSQL + Prisma to Oracle DB
- **Requirements** (from `whattodonow.md`):
  - Keep existing backend logic
  - Replace Prisma with Oracle DB native driver
  - Maintain `new-client` directory untouched
- **Decisions Needed**:
  - [ ] Choose Oracle driver: `oracledb` (node-oracledb) or `oracle`?
  - [ ] Schema migration strategy (keep Prisma types or manual SQL?)
  - [ ] Connection pooling configuration
  - [ ] PostGIS equivalent for geospatial queries (Oracle Spatial?)
- **Files**: 
  - `server/src/db/oracle.ts` (exists, needs review)
  - `server/prisma/schema.prisma` (reference for migration)
- **Labels**: `database`, `migration`

### ⬜ Task 4: Execute Oracle DB Migration
- **Status**: ⏸️ Blocked (depends on Task 3 decisions)
- **Steps**:
  1. Create Oracle schema based on Prisma schema
  2. Update all controller queries to use Oracle syntax
  3. Test transaction handling (Applications + Leases)
  4. Migrate seed data
  5. Update deployment docs
- **Files**: 
  - All `server/src/controllers/*.ts`
  - `server/src/db/oracle.ts`
- **Labels**: `database`, `migration`

---

## 🟢 **DOCUMENTATION & DEVOPS** (Priority 3)

### ⬜ Task 5: Document Authentication Flow
- **Status**: 📋 To Do
- **Goal**: Create comprehensive AWS Cognito setup guide
- **Content**:
  - User pool configuration
  - Custom attributes (`custom:role`)
  - JWT token structure
  - Frontend Amplify setup
  - Testing with mock tokens
- **Files**: `docs/AUTH_SETUP.md` (new)
- **Labels**: `documentation`

### ⬜ Task 6: Add Health Check Endpoint
- **Status**: 📋 To Do
- **Goal**: `/health` endpoint for monitoring
- **Returns**: 
  - Server status
  - Oracle DB connection status
  - Environment validation status
- **Files**: `server/src/index.ts`
- **Labels**: `devops`, `monitoring`

### ⬜ Task 7: Docker Compose Enhancement
- **Status**: 📋 To Do
- **Goal**: Add Oracle DB to docker-compose.yml
- **Current**: Only basic structure exists
- **Add**: 
  - Oracle DB container configuration
  - Environment variable management
  - Volume mounts for persistence
- **Files**: `docker-compose.yml`
- **Labels**: `devops`, `docker`

---

## 📋 **TESTING & QUALITY** (Priority 4)

### ⬜ Task 8: Add Integration Tests
- **Status**: 📋 To Do
- **Scope**:
  - Auth middleware tests
  - API endpoint tests
  - Database transaction tests
- **Tools**: Jest, Supertest
- **Files**: `server/tests/` (new directory)
- **Labels**: `testing`, `quality`

### ⬜ Task 9: Add Frontend E2E Tests
- **Status**: 📋 To Do
- **Scope**:
  - Login flow (Manager + Tenant)
  - Property creation
  - Application submission
- **Tools**: Playwright or Cypress
- **Files**: `new-client/e2e/` (new directory)
- **Labels**: `testing`, `frontend`

---

## 🎯 **CURRENT SPRINT FOCUS**

**Sprint Goal**: Secure the authentication layer and prepare for Oracle migration

**This Week**:
- ✅ Task 1: Fix JWT verification
- ⬜ Task 2: Environment validation
- ⬜ Task 3: Oracle DB planning decisions

**Next Week**:
- ⬜ Task 4: Execute Oracle migration
- ⬜ Task 6: Health check endpoint

---

## 📝 **NOTES**

- Repository has **issues disabled** - using this file for tracking
- `new-client` directory is frozen (per `whattodonow.md`)
- All backend changes must be backward-compatible until migration complete
- AWS credentials must NEVER be committed to git

---

## 🔗 **REFERENCES**

- [whattodonow.md](./whattodonow.md) - Current migration goal
- [whatisthepremade.md](./whatisthepremade.md) - Project structure
- [whatisusermade.md](./whatisusermade.md) - Custom components
- [AWS Cognito Docs](https://docs.aws.amazon.com/cognito/)
- [Oracle Node.js Driver](https://oracle.github.io/node-oracledb/)

---

**Legend:**  
✅ Complete | 🟡 In Progress | 📋 To Do | ⏸️ Blocked | ❌ Cancelled