# TeachFlow API Endpoints

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/logout` | Logout current session |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/google` | OAuth with Google |
| POST | `/api/auth/microsoft` | OAuth with Microsoft |

---

## Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id` | Get user profile |
| PUT | `/api/users/:id` | Update user profile |
| DELETE | `/api/users/:id` | Delete user account |
| GET | `/api/users/:id/settings` | Get user settings |
| PUT | `/api/users/:id/settings` | Update user settings |

---

## Lessons

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lessons` | List lessons (with filters) |
| GET | `/api/lessons/:id` | Get lesson details |
| POST | `/api/lessons` | Create new lesson |
| PUT | `/api/lessons/:id` | Update lesson |
| DELETE | `/api/lessons/:id` | Delete lesson |
| POST | `/api/lessons/:id/duplicate` | Duplicate lesson |
| POST | `/api/lessons/:id/publish` | Publish to library |
| GET | `/api/lessons/:id/export/pdf` | Export lesson as PDF |

**Query Parameters for GET `/api/lessons`:**
- `subject` - Filter by subject (math, physics, etc.)
- `grade` - Filter by grade level (1-12)
- `duration` - Filter by duration (15, 30, 45, 60 min)
- `search` - Search by title/keywords
- `page` - Page number
- `limit` - Items per page
- `sort` - Sort field (createdAt, rating, views)

---

## Lesson Blocks (for builder)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lessons/:id/blocks` | Get lesson blocks |
| POST | `/api/lessons/:id/blocks` | Add block to lesson |
| PUT | `/api/lessons/:id/blocks/:blockId` | Update block |
| DELETE | `/api/lessons/:id/blocks/:blockId` | Delete block |
| PUT | `/api/lessons/:id/blocks/reorder` | Reorder blocks |

---

## Classes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/classes` | List user's classes |
| GET | `/api/classes/:id` | Get class details |
| POST | `/api/classes` | Create new class |
| PUT | `/api/classes/:id` | Update class |
| DELETE | `/api/classes/:id` | Delete class |
| GET | `/api/classes/:id/students` | Get students in class |
| POST | `/api/classes/:id/students` | Add student to class |
| DELETE | `/api/classes/:id/students/:studentId` | Remove student |

---

## Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assignments` | List assignments |
| GET | `/api/assignments/:id` | Get assignment details |
| POST | `/api/assignments` | Create assignment |
| PUT | `/api/assignments/:id` | Update assignment |
| DELETE | `/api/assignments/:id` | Delete assignment |
| GET | `/api/assignments/:id/submissions` | Get submissions |
| PUT | `/api/assignments/:id/submissions/:subId` | Grade submission |

---

## Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/class/:id` | Get class report |
| GET | `/api/reports/student/:id` | Get student report |
| GET | `/api/reports/assignments` | Get assignments overview |
| GET | `/api/reports/export` | Export report as PDF/CSV |

---

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get user notifications |
| PUT | `/api/notifications/:id/read` | Mark as read |
| PUT | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |

---

## Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations` | List connected integrations |
| POST | `/api/integrations/google-classroom` | Connect Google Classroom |
| DELETE | `/api/integrations/google-classroom` | Disconnect |
| POST | `/api/integrations/google-classroom/sync` | Sync classes |
| POST | `/api/integrations/microsoft-teams` | Connect Teams |
| DELETE | `/api/integrations/microsoft-teams` | Disconnect |

---

## Subscription

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscription` | Get current subscription |
| POST | `/api/subscription/checkout` | Start checkout session |
| POST | `/api/subscription/portal` | Open customer portal |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |
