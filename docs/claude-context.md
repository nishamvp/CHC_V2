# CHC v2 — Consolidated Project Context

Source: user-authorized Claude shared conversation, reviewed 2026-09-20. This is a working context summary, not a replacement for the approved architecture plan.

## Product scope

CHC v2 is a municipality customer-happiness CRM. CHC staff create requests for new or existing customers; a Head of Section (HoS) assigns a section staff member, reviews their reply, and replies to CHC. CHC completes or reopens the request. Users can exchange comments and attachments throughout.

Required extensions:

- Separate `Customer` entity, with phone normalized to E.164 and unique per organization.
- Subrequests: a request is a child `Request` linked by `parentRequestId`; a parent cannot complete while children are open.
- Multi-request creation for one customer visit, using one transaction and shared batch ID.
- HoS direct handling when a department has no staff.
- HoS special requests for their own department.
- CHC Emergency as a parallel 24x7 Unit sharing the workflow engine; peer visibility is permission-controlled.
- PBX/call-center screen-pop: find customer by incoming phone, show history; manual lookup is fallback.
- Future customer mobile application, using the same versioned API.
- English and Arabic/RTL are required.

## Architecture decisions (settled)

- Use a modular monolith, not microservices.
- Monorepo: Turborepo/NPM workspaces, with `apps/api`, `apps/web`, `apps/worker`, `packages/db`, and `packages/shared`.
- API: NestJS on the Express adapter. Do **not** migrate to Fastify merely for theoretical speed; optimize and profile first.
- Data: PostgreSQL and Prisma, not MongoDB. Redis/BullMQ for asynchronous work. MinIO/S3 for files, never local repository disk.
- Tenant boundary: `Organization`. CHC and CHC Emergency are Units, **not** tenants.
- Authorization: persistent RBAC with permission records and user-role assignments. Do not use hardcoded role-string checks in domain logic. A user may have multiple scoped roles (`GLOBAL`, `UNIT`, `DEPARTMENT`).
- Permission checks are condition-aware: administrative/CHC global visibility must not accidentally be restricted to department scope; department actors only operate in their memberships/scope.
- JWT access token is short-lived; refresh token is rotated and stored as a hash. Use httpOnly cookies in the web client rather than browser local storage for tokens.
- Validate input with shared Zod schemas and `nestjs-zod`; do not duplicate DTO shapes as controller-only interfaces.
- Use enums for closed state sets (request status, request channel, role scope, membership position, customer createdVia), but regular strings for flexible labels such as request type.
- Every status change is performed by one `transition()` service which writes immutable `RequestEvent` audit entries; no controller/service sets request status directly.
- Request numbers must use a transactional per-organization sequence, never `countDocuments()`.

## v1 risks that v2 fixes

- Express route-file bloat (~2,786 lines), hardcoded role middleware, and flat request/customer data.
- Untyped `Section.sub` data and username-string relationships.
- Mixed request status enum plus boolean/string flags.
- Local attachment URLs and ~155 MB uploads in source repository.
- Inline email sends and race-prone request numbering.

## Verified implementation progress from Claude

### Phase 0

- Architecture/report and implementation plan reviewed.
- Docker/Postgres local environment installed and running on port 5433.
- Prisma database initialized.

### Phase 1 — completed

- Turborepo monorepo scaffolded.
- NestJS API runs locally (historically port 3001 in the Claude walkthrough).
- Auth module, tenant-aware Organization/User models, seeded admin, access/refresh JWT flow, refresh-token hashing/rotation, and account auth checks implemented.
- Departments/SubDepartments and DepartmentMembership implemented.
- Permission/RBAC model implemented and tested: a zero-role user received the expected 403.
- Arabic name fields and scoped role/membership enums were corrected through migrations.

### Phase 2 — in progress

- Customer model and Customers module implemented.
- Phone normalization was verified both ways: creating `0501234567` and looking up `+971501234567` returned the same Customer record.
- Day 7 started. `RequestStatus`, `RequestChannel`, `Request`, and `RequestEvent` were added to the Prisma schema, including reverse relations. The next intended task was to run and validate the migration, then build request-number sequencing and the transition service.

## Latest checkpoint / continuation order

1. Inspect current schema and run `prisma format`, `prisma generate`, and a safe development migration for the Request and RequestEvent additions.
2. Confirm generated client and API compilation before adding more code.
3. Implement request-number sequencing and the transactional Request creation path.
4. Implement the sole Request transition service + audit event append.
5. Continue Phase 2: request API, assignment, HoS review, comments, attachment registration/MinIO, notifications/worker.
6. Only then implement Phase 3 extras (subrequests, special requests, multi-request) and remaining plan phases.

## Communication preference

Keep explanations simple, direct, and short. For each implementation step, cross-check the approved plan and existing code. Do not choose a quick fix that weakens scalability; state clearly when an approach is wrong for the project.
