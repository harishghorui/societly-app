# Societly App - AI Agent Context File

## 🎯 Project Overview

Societly is a highly generalized, multi-tenant B2B SaaS housing society management platform split into a Node.js backend and a bare React Native mobile frontend. The application uses a **Search-First Onboarding** strategy to prevent duplicate data fragmentation.

---

# 🏛️ Architecture & Constraints

## 1. Database & Multitenancy (Crucial)

* **Pattern:** Membership-based Junction Architecture.
* **Logic:** A `User` (Identity: Phone + PIN) is completely decoupled from a `Society` (Building Entity). Their relationship is mapped via a `Membership` table.
* **Why?:** This allows a single user to hold multiple profiles across different buildings (e.g., an Admin in Building A, a Tenant in Building B) using one phone number without data conflicts.

## 2. Physical Layout & Scope Hierarchy

To support both compact buildings and sprawling multi-tower residential complexes, the property hierarchy must be rigidly decoupled:

```text
Societies → Wings → Flats
```

* Different wings can have unique flat structures, flat types (`1BHK`, `2BHK`, `3BHK`, `Shop`, `Office`, `Other`), and custom dimensional attributes (`squareFootage`).
* **Initial Setup Authority:** The society committee (Admin) maintains absolute ownership over the property master layout ledger (Flat numbers, sizes, types). Individual residents can only look up and "Claim" pre-populated units to prevent under-reporting or layout errors.

## 3. Granular RBAC Matrix & Scoping

Authorization policies must enforce strict boundary gates checked at the backend API layer using the following operational matrix:

| Role                      | Scope                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Super Admin               | Entire ecosystem platform control (onboarding societies, global SaaS subscriptions) |
| Society Admin / Secretary | Global society operational scope                                                    |
| Treasurer                 | Unrestricted access to full society financials (bypasses wing barriers)             |
| Committee Member          | Society-level operational views                                                     |
| Wing Admin                | Management control restricted exclusively to their assigned `wingId`                |
| Resident (Owner/Tenant)   | Limited strictly to their assigned `flatId` and public society bulletin boards      |

## 4. Uniform Network Contract & Error Handling

### API Interface Boundary

Both frontend and backend must strictly conform to the static `ApiResponse` interface contract to eliminate generic fallback strings and app crashes:

```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;     // Machine-readable uppercase codes
    details?: any;    // Validation arrays or raw system error strings
  };
}
```

### Axios Interceptor Execution

The mobile network agent uses response interceptors to automatically flatten successful payloads:

```typescript
return response.data;
```

Error handling must reject error codes in exact conformity with the `ApiResponse` shape.

Frontend files must wrap catches by casting to this contract type:

```typescript
(err as ApiResponse)
```

## 5. Cloudflare R2 Storage Architecture

* Media asset storage is centralized via Cloudflare R2 using the official AWS S3 SDK on the backend server.
* Files must be asynchronously uploaded as transient memory streams.
* Storage must be separated into folders:

```text
complaints/
profiles/
documents/
receipts/
notices/
```

* All storage actions return an absolute, immutable custom public URL.

## 6. Automated Queue-Less Billing & Wallet Ledger

### Scalability Guard

To handle high volume without blocking the main Express thread or overloading server resources, invoicing runs via a state-driven batch routine.

### Billing Cycles

Batch generation runs automatically on the 1st of every month via a synchronized `node-cron` scheduler.

A `BillingCycle` row tracks execution state:

```text
draft → processing → completed → failed
```

This enables safe crash recovery. On application boot, a startup recovery hook ([recoverBillingCycles](file:///home/harish/Harish/Git/societly-app/backend/src/workers/billingScheduler.ts#L11-L32)) finds any stuck `processing` records (which can happen if the server crashes mid-batch) and marks them as `failed` with a recovery log. Because the invoice generation process is fully idempotent, these failed batches can be safely re-run without duplicating invoices.

### Pricing Cascade

Maintenance amounts fall back through a hierarchical configuration chain:

```text
Wing-Level Settings → Society-Level Configuration
```

### Advance Payments Wallet

Upfront maintenance payments are stored in:

```typescript
advanceWalletBalance
```

To prevent concurrent race conditions (e.g., if a resident attempts to use or modify their wallet balance at the exact second the cron job executes):

1. The billing engine re-queries each target `Membership` record inside a strict transaction utilizing a row lock (`FOR UPDATE` / `t.LOCK.UPDATE`).
2. Checks available balance.
3. Deducts applicable amounts.
4. Settles invoices during generation and commits changes, releasing the lock.

This avoids generating mock future invoices and guarantees financial consistency.

### Late Penalty Engine

Calculates due dates using:

```typescript
gracePeriodDays
```

and appends either:

* Fixed penalties
* Interest-based charges

to outstanding invoices.

---

# Strict Technical Stack Rules

## Backend

### Runtime

```text
Node.js v24+
Executed via tsx watch
```

### ORM

```text
Sequelize + PostgreSQL
```

### Currency Standard

All calculations, values, and settings must be tracked exclusively in:

```text
Indian Rupee (INR / ₹)
```

### Module System

```json
{
  "type": "module"
}
```

### TypeScript Rule

```json
{
  "module": "NodeNext",
  "moduleResolution": "NodeNext"
}
```

**CRITICAL**

All local backend imports MUST include `.js` extensions:

```typescript
import User from './models/User.js';
```

### Sequelize Model Fields

Use `declare` property modifiers to avoid shadowing Sequelize getters/setters:

```typescript
declare id: number;
```

NOT:

```typescript
public id: number;
```

Additionally, to enforce absolute compile-time type-safety across models and association mappings, **always** extend `Model` using `InferAttributes` and `InferCreationAttributes` from `sequelize`:

```typescript
import { Model, InferAttributes, InferCreationAttributes } from "sequelize";

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: number;
  declare name: string;
  declare phone: string;
}
```

---

## Frontend

### Framework

```text
Bare React Native (No Expo)
```

### Styling

```text
NativeWind (Tailwind via className)
```

### Input Safety Rules

```tsx
className="text-slate-800"
placeholderTextColor="#94a3b8"
keyboardAppearance="light"
```

These are mandatory to avoid dark mode visibility issues.

### Bundler

```text
Metro Bundler
```

Do NOT add `.js` extensions to mobile imports.

### Layout Constraints

Never place:

```tsx
justifyContent
```

directly on a `ScrollView` via Tailwind classes.

Instead use:

```tsx
contentContainerStyle
```

### UI Feedback & Notifications

#### Toasts

```text
react-native-toast-message
```

Used for:

* Success notifications
* Error notifications
* Informational notifications

Initialized globally inside `App.tsx`.

#### Alerts

Do NOT use:

```tsx
Alert.alert()
```

Always use:

```tsx
<CustomAlert />
```

embedded inside the screen tree.

Used for:

* Confirmations
* Critical warnings
* Interactive prompts

---

# 📂 System File Map

```text
societly-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts
│   │   │   └── firebase.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── complaintController.ts
│   │   │   ├── directoryController.ts
│   │   │   ├── financeController.ts
│   │   │   ├── invoiceController.ts
│   │   │   ├── noticeController.ts
│   │   │   ├── notificationController.ts
│   │   │   └── societyController.ts
│   │   ├── models/
│   │   │   ├── index.ts
│   │   │   ├── BillingConfig.ts
│   │   │   ├── BillingCycle.ts
│   │   │   ├── Complaint.ts
│   │   │   ├── Device.ts
│   │   │   ├── Expense.ts
│   │   │   ├── Flat.ts
│   │   │   ├── Invoice.ts
│   │   │   ├── Membership.ts
│   │   │   ├── Notice.ts
│   │   │   ├── NotificationLog.ts
│   │   │   ├── Society.ts
│   │   │   ├── SocietyBalance.ts
│   │   │   ├── User.ts
│   │   │   └── Wing.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── complaintRoutes.ts
│   │   │   ├── directoryRoutes.ts
│   │   │   ├── financeRoutes.ts
│   │   │   ├── invoiceRoutes.ts
│   │   │   ├── noticeRoutes.ts
│   │   │   ├── notificationRoutes.ts
│   │   │   └── societyRoutes.ts
│   │   ├── services/
│   │   │   ├── billingEngineService.ts
│   │   │   └── pushService.ts
│   │   ├── utils/
│   │   │   ├── ApiResponse.ts
│   │   │   ├── generateCode.ts
│   │   │   ├── r2Uploader.ts
│   │   │   └── responseWrapper.ts
│   │   ├── workers/
│   │   │   └── billingScheduler.ts
│   │   └── app.ts
│   └── .env
│
└── mobile/
    ├── src/
    │   ├── api/
    │   │   └── client.ts
    │   ├── components/
    │   │   ├── CustomAlert.tsx
    │   │   ├── ExpenseModal.tsx
    │   │   ├── Navbar.tsx
    │   │   ├── NoticeModal.tsx
    │   │   └── Sidebar.tsx
    │   ├── hooks/
    │   │   ├── useBillingConfig.ts
    │   │   ├── useComplaints.ts
    │   │   ├── useDirectory.ts
    │   │   ├── useExpenses.ts
    │   │   ├── useFinance.ts
    │   │   ├── useNotifications.ts
    │   │   ├── usePropertyLayout.ts
    │   │   └── useSociety.ts
    │   ├── screens/
    │   │   ├── AdminVerificationDesk.tsx
    │   │   ├── AuthScreen.tsx
    │   │   ├── BillingConfigScreen.tsx
    │   │   ├── ComplaintDetailScreen.tsx
    │   │   ├── ComplaintFormScreen.tsx
    │   │   ├── ComplaintScreen.tsx
    │   │   ├── DashboardHome.tsx
    │   │   ├── DirectoryScreen.tsx
    │   │   ├── GatewayScreen.tsx
    │   │   ├── NotificationScreen.tsx
    │   │   ├── ProfilePicker.tsx
    │   │   ├── ResidentLedgerScreen.tsx
    │   │   └── SocietyProfileScreen.tsx
    │   ├── services/
    │   │   └── notificationService.ts
    │   ├── store/
    │   │   └── useAuthStore.ts
    │   ├── types/
    │   │   └── api.types.ts
    │   └── utils/
    │       └── theme.ts
    └── App.tsx
```

# 🚦 Workflow Operations

## Secure Anonymous Complaint Path

1. Resident files a ticket with anonymous mode enabled.
2. Client uploads text + image array.
3. Backend uploads images to Cloudflare R2 via [r2Uploader.ts](file:///home/harish/Harish/Git/societly-app/backend/src/utils/r2Uploader.ts).
4. **Data Isolation Guard**: The file path generator uses `crypto.randomBytes(16).toString("hex")` to produce a completely randomized filename (e.g., `complaints/a5b6c7d8....jpg`) without embedding any user ID, membership ID, or other identifier keys in the path or metadata.
5. Controller writes:

```typescript
membershipId = null
```

while preserving:

```typescript
societyId
```

This allows resolution without exposing resident identity.

---

## Privacy-Preserving Resident Lookup Path

1. User opens `DirectoryScreen`.
2. Client sends role-aware lookup request.
3. Backend reads requester's membership role.
4. Privacy gate executes:

### Admin / Secretary

* Full visibility

### Resident

* Neighbor-only access

### Hidden Phone Numbers

If:

```typescript
hidePhoneNumber === true
```

the backend replaces the value with:

```text
Private
```

before sending data to clients.

---

## Notice Board & Announcements Broadcasting Path

1. Admin creates a bulletin board notification via `NoticeModal` (headline title + body description + selected category `Urgent`, `General`, or `Event`).
2. Backend validates fields, checks if category is valid, and saves a new `Notice` database record with the specified category (defaulting to `General`).
3. Backend calls `broadcastToSociety` asynchronously inside `pushService` to dispatch alerts to all push-registered devices under the target society, passing the category in the FCM message `data` payload.
4. New notices are fetched chronologically on `DashboardHome` and displayed next to colored badges using NativeWind (red for Urgent, blue for General, emerald for Event).

---

## Historical Expense Auditing Path

1. Admins/Treasurers can view historical society payouts (e.g., watchmen, sweeper fees) in the chronological list view card on the main dashboard (`DashboardHome`).
2. The frontend fetches past payouts from the `GET /finance/history` endpoint, which is protected using `authenticateJWT` and `requireRole(['admin', 'treasurer'])` middleware.
3. Newly logged operational expenses are formatted using the native `₹` symbol prefix and live-refreshed dynamically on successfully calling `onExpenseLogged`.

---

## Maintenance Payment Proof Submission & Verification Path

1. Resident reviews active due invoices in `ResidentLedgerScreen`.
2. Resident uploads image proof of bank transfer / cheque / cash deposit, specifying cash or cheque method, payment reference UTR, and remarks.
3. Backend uploads receipt images via Cloudflare R2 and flags invoice status to `pending_approval`.
4. Society Admin reviews pending proofs in `AdminVerificationDesk` and manually clicks "Verify Cash" or "Verify Cheque / Bank".
5. Backend updates the invoice to `paid` in a database transaction, updates the paid timestamp, and broadcasts a status update.

---

## Property Layout Configuration Path

1. Admin opens `SocietyProfileScreen` and clicks 'Edit' (if admin).
2. Admin chooses the society structure type ('Single Building' vs 'Multi-Wing').
3. For Single Building structures, flats are configured under an implicit single list. For Multi-Wing structures, a wing-based layout cards builder is rendered.
4. Admin defines/updates flat numbers, BHK types, and square footage.
5. Saving triggers a custom confirmation alert, then calls the backend to update both the society details and the wings/flats structure.

---

# ⚠️ Common Agent Pitfalls to Avoid

### Backend

❌ Never remove `.js` extensions from backend imports.

```typescript
import User from './models/User.js';
```

### Mobile

❌ Never add `.js` extensions to React Native imports.

### React Native Components

❌ Never use:

```html
<div>
<span>
```

Use:

```tsx
<View>
<Text>
```

instead.

### Sequelize

❌ Never change:

```typescript
sequelize.sync({ alter: true });
```

to:

```typescript
sequelize.sync({ force: true });
```

in production.

### Alerts

❌ Never use:

```typescript
Alert.alert()
```

Always use:

```tsx
<CustomAlert />
```

for consistent branded UX.

