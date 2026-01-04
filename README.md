# Expense Tracker API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Authentication Routes](#authentication-routes)
   - [Group Routes](#group-routes)
   - [Expense Routes](#expense-routes)
   - [Category Routes](#category-routes)
   - [Notification Routes](#notification-routes)
   - [ImageKit Routes](#imagekit-routes)
4. [Data Models](#data-models)
5. [Common Workflows](#common-workflows)
6. [Error Handling](#error-handling)

---

## Overview

Base URL: `http://localhost:5000/api` (or your deployment URL)

This API provides a complete expense tracking and splitting system with support for:
- User registration and authentication
- Group creation and management
- Expense creation with flexible splitting
- Payment settlements with verification
- Pending member invitations
- Real-time notifications

---

## Authentication

### JWT Token Authentication
All protected routes require a JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

### Getting a Token
Tokens are issued upon successful login or registration and are valid for 30 days.

---

## API Endpoints

### Authentication Routes
Base: `/api/auth`

#### Register User
```http
POST /api/auth/register
```

**Access**: Public

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Validation**:
- All fields required
- Password minimum 6 characters
- Email must be unique

**Response** (201):
```json
{
  "_id": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Welcome! You've been added to 2 group(s) you were invited to.",
  "convertedGroups": 2
}
```

**Special Feature**: If email matches pending invitations, automatically converts to full member and updates all related expenses.

---

#### Login User
```http
POST /api/auth/login
```

**Access**: Public

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "_id": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error** (401):
```json
{
  "message": "Invalid credentials"
}
```

---

#### Get Current User
```http
GET /api/auth/me
```

**Access**: Private

**Response** (200):
```json
{
  "_id": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "https://imagekit.io/...",
  "isAdmin": false,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-04T00:00:00.000Z"
}
```

---

#### Update Profile
```http
PUT /api/auth/profile
```

**Access**: Private

**Request Body** (all fields optional):
```json
{
  "name": "John Smith",
  "avatar": "https://imagekit.io/...",
  "password": "newpassword123"
}
```

**Response** (200):
```json
{
  "_id": "user123",
  "name": "John Smith",
  "email": "john@example.com",
  "avatar": "https://imagekit.io/...",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### Search Users
```http
GET /api/auth/search?email=john
```

**Access**: Private

**Query Parameters**:
- `email` (required): Search term for email

**Response** (200):
```json
[
  {
    "_id": "user456",
    "name": "John Smith",
    "email": "john.smith@example.com",
    "avatar": "https://imagekit.io/..."
  }
]
```

**Note**: Returns max 10 results, excludes current user

---

### Group Routes
Base: `/api/groups`

#### Create Group
```http
POST /api/groups
```

**Access**: Private

**Request Body**:
```json
{
  "name": "Roommates",
  "currency": "USD",
  "members": ["user456", "user789"],
  "icon": "fas fa-home",
  "image": "https://imagekit.io/..."
}
```

**Required Fields**: `name`

**Response** (201):
```json
{
  "_id": "group123",
  "name": "Roommates",
  "currency": "USD",
  "icon": "fas fa-home",
  "image": "https://imagekit.io/...",
  "members": [
    {
      "_id": "user123",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": ""
    }
  ],
  "pendingMembers": [],
  "createdBy": {
    "_id": "user123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "createdAt": "2026-01-04T00:00:00.000Z",
  "updatedAt": "2026-01-04T00:00:00.000Z"
}
```

---

#### Get All Groups
```http
GET /api/groups
```

**Access**: Private

**Response** (200):
```json
[
  {
    "_id": "group123",
    "name": "Roommates",
    "currency": "USD",
    "icon": "fas fa-home",
    "image": null,
    "members": [...],
    "pendingMembers": [
      {
        "email": "pending@example.com",
        "name": "Pending User",
        "invitedBy": {...},
        "invitedAt": "2026-01-03T00:00:00.000Z"
      }
    ],
    "createdBy": {...},
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-04T00:00:00.000Z"
  }
]
```

---

#### Get Single Group
```http
GET /api/groups/:id
```

**Access**: Private (must be member)

**Response** (200): Same as single group object above

**Error** (403):
```json
{
  "message": "Not authorized to view this group"
}
```

---

#### Update Group
```http
PUT /api/groups/:id
```

**Access**: Private (creator only)

**Request Body** (all optional):
```json
{
  "name": "New Name",
  "currency": "EUR",
  "icon": "fas fa-users",
  "image": "https://imagekit.io/..."
}
```

**Response** (200): Updated group object

---

#### Add Member
```http
POST /api/groups/:id/members
```

**Access**: Private (must be member)

**Request Body Option 1** (Registered User):
```json
{
  "userId": "user789"
}
```

**Request Body Option 2** (Pending Member):
```json
{
  "email": "newuser@example.com",
  "name": "New User"
}
```

**Response** (200): Updated group with new member

**Behavior**:
- If userId provided: Adds existing user immediately
- If email provided: Checks if user exists first
  - If exists: Adds to members
  - If not: Adds to pendingMembers and creates PendingMember record

---

#### Remove Member
```http
DELETE /api/groups/:id/members/:userId
```

**Access**: Private (creator or self)

**Response** (200): Updated group

---

#### Delete Group
```http
DELETE /api/groups/:id
```

**Access**: Private (creator only)

**Response** (200):
```json
{
  "message": "Group and associated expenses deleted"
}
```

**Note**: Deletes all expenses in the group as well

---

#### Get Group Balances
```http
GET /api/groups/:id/balances
```

**Access**: Private (must be member)

**Response** (200):
```json
[
  {
    "user": {
      "_id": "user123",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": ""
    },
    "balance": 45.50,
    "isPending": false
  },
  {
    "user": {
      "name": "Pending User",
      "email": "pending@example.com"
    },
    "balance": -45.50,
    "isPending": true
  }
]
```

**Balance Interpretation**:
- Positive: Person is owed money
- Negative: Person owes money
- Zero: Settled up

---

### Expense Routes
Base: `/api/expenses`

#### Create Expense
```http
POST /api/expenses
```

**Access**: Private (must be group member)

**Request Body**:
```json
{
  "description": "Dinner at Italian Restaurant",
  "amount": 150.00,
  "date": "2026-01-04T19:00:00.000Z",
  "group": "group123",
  "category": "category456",
  "type": "EXPENSE",
  "splits": [
    {
      "user": "user123",
      "amount": 50.00
    },
    {
      "user": "user456",
      "amount": 50.00
    },
    {
      "email": "pending@example.com",
      "name": "Pending User",
      "amount": 50.00
    }
  ],
  "receiptImage": "https://imagekit.io/..."
}
```

**Required Fields**: `description`, `amount`, `group`, `splits`

**Validation**:
- Splits must sum to amount (tolerance: 0.01)
- Each split must have either `user` OR `email`+`name`

**Response** (201):
```json
{
  "_id": "expense123",
  "description": "Dinner at Italian Restaurant",
  "amount": 150.00,
  "date": "2026-01-04T19:00:00.000Z",
  "group": {
    "_id": "group123",
    "name": "Roommates"
  },
  "category": {
    "_id": "category456",
    "name": "Food & Dining",
    "icon": "fas fa-utensils"
  },
  "type": "EXPENSE",
  "payer": {
    "_id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": ""
  },
  "receiptImage": "https://imagekit.io/...",
  "splits": [
    {
      "user": {
        "_id": "user123",
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": ""
      },
      "amount": 50.00,
      "isPending": false
    },
    {
      "email": "pending@example.com",
      "name": "Pending User",
      "amount": 50.00,
      "isPending": true
    }
  ],
  "createdAt": "2026-01-04T20:00:00.000Z",
  "updatedAt": "2026-01-04T20:00:00.000Z"
}
```

---

#### Get User's All Expenses
```http
GET /api/expenses/user/all
```

**Access**: Private

**Response** (200): Array of expense objects (last 50)

---

#### Get Group Expenses
```http
GET /api/expenses/group/:groupId
```

**Access**: Private (must be member)

**Response** (200): Array of all expenses in group, sorted by date (newest first)

---

#### Get Single Expense
```http
GET /api/expenses/:id
```

**Access**: Private (must be group member)

**Response** (200): Single expense object with full population

---

#### Update Expense
```http
PUT /api/expenses/:id
```

**Access**: Private (payer only)

**Request Body** (all optional):
```json
{
  "description": "Updated description",
  "amount": 160.00,
  "date": "2026-01-04T19:30:00.000Z",
  "category": "category789",
  "splits": [...],
  "receiptImage": "https://imagekit.io/..."
}
```

**Response** (200): Updated expense object

---

#### Delete Expense
```http
DELETE /api/expenses/:id
```

**Access**: Private (payer only)

**Response** (200):
```json
{
  "message": "Expense deleted"
}
```

---

#### Settle Up (Record Payment)
```http
POST /api/expenses/settle
```

**Access**: Private (must be group member)

**Request Body**:
```json
{
  "group": "group123",
  "payer": "user456",
  "receiver": "user123",
  "amount": 75.00,
  "paymentMethod": "UPI",
  "transactionId": "TXN123456789",
  "remarks": "Settling up dinner expenses",
  "date": "2026-01-04T20:00:00.000Z",
  "receiptImage": "https://imagekit.io/..."
}
```

**Required Fields**: `group`, `payer`, `receiver`, `amount`

**Payment Methods**: 
- CASH
- BANK_TRANSFER
- UPI
- CREDIT_CARD
- DEBIT_CARD
- PAYPAL
- VENMO
- OTHER

**Response** (201):
```json
{
  "_id": "payment123",
  "description": "Payment: Jane Smith → John Doe",
  "amount": 75.00,
  "date": "2026-01-04T20:00:00.000Z",
  "group": {
    "_id": "group123",
    "name": "Roommates"
  },
  "type": "PAYMENT",
  "payer": {
    "_id": "user456",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "avatar": ""
  },
  "receiver": {
    "_id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": ""
  },
  "paymentDetails": {
    "method": "UPI",
    "transactionId": "TXN123456789",
    "remarks": "Settling up dinner expenses",
    "recordedBy": {
      "_id": "user123",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": ""
    }
  },
  "verification": {
    "isVerified": false,
    "status": "PENDING"
  },
  "receiptImage": "https://imagekit.io/...",
  "splits": [
    {
      "user": {
        "_id": "user123",
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": ""
      },
      "amount": 75.00
    }
  ],
  "createdAt": "2026-01-04T20:00:00.000Z",
  "updatedAt": "2026-01-04T20:00:00.000Z"
}
```

**Note**: Any member can record a payment. The `recordedBy` field tracks who created the record.

---

#### Verify Payment
```http
PUT /api/expenses/:id/verify
```

**Access**: Private (receiver only)

**Request Body**:
```json
{
  "status": "ACCEPTED"
}
```

**Status Options**: 
- ACCEPTED
- DISPUTED

**Response** (200): Payment object with updated verification

---

#### Get Group Payments
```http
GET /api/expenses/group/:groupId/payments
```

**Access**: Private (must be member)

**Response** (200): Array of payment records in group

---

#### Get Payments Between Users
```http
GET /api/expenses/payments/between?user1=user123&user2=user456&group=group123
```

**Access**: Private

**Query Parameters**:
- `user1` (required)
- `user2` (required)
- `group` (optional): Filter by specific group

**Response** (200):
```json
{
  "payments": [...],
  "summary": {
    "totalPayments": 5,
    "netAmount": 25.50,
    "netDirection": "User 1 has paid 25.5 more"
  }
}
```

---

#### Update Payment Remarks
```http
PUT /api/expenses/:id/remarks
```

**Access**: Private (payer, receiver, or recorder)

**Request Body**:
```json
{
  "remarks": "Updated remarks text"
}
```

**Response** (200): Updated payment object

---

### Category Routes
Base: `/api/categories`

#### Get All Categories
```http
GET /api/categories
```

**Access**: Private

**Response** (200):
```json
[
  {
    "_id": "cat123",
    "name": "Food & Dining",
    "icon": "fas fa-utensils",
    "type": "expense",
    "createdBy": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  },
  {
    "_id": "cat456",
    "name": "My Custom Category",
    "icon": "fas fa-star",
    "type": "expense",
    "createdBy": "user123",
    "createdAt": "2026-01-04T00:00:00.000Z",
    "updatedAt": "2026-01-04T00:00:00.000Z"
  }
]
```

**Note**: Returns global categories (`createdBy: null`) + user's custom categories

---

#### Create Category
```http
POST /api/categories
```

**Access**: Private

**Request Body**:
```json
{
  "name": "Custom Category",
  "icon": "fas fa-star",
  "type": "expense"
}
```

**Required Fields**: `name`, `icon`

**Response** (201): Created category object

---

#### Update Category
```http
PUT /api/categories/:id
```

**Access**: Private (creator only)

**Request Body** (all optional):
```json
{
  "name": "Updated Name",
  "icon": "fas fa-heart",
  "type": "income"
}
```

**Response** (200): Updated category object

**Error** (403):
```json
{
  "message": "Not authorized to update this category"
}
```

---

#### Delete Category
```http
DELETE /api/categories/:id
```

**Access**: Private (creator only)

**Response** (200):
```json
{
  "message": "Category deleted"
}
```

---

#### Seed Default Categories
```http
POST /api/categories/seed
```

**Access**: Private

**Response** (201):
```json
{
  "message": "Categories seeded successfully",
  "count": 15,
  "categories": [...]
}
```

**Default Categories**:
- Food & Dining
- Transportation
- Groceries
- Entertainment
- Utilities
- Rent
- Healthcare
- Shopping
- Travel
- Education
- Sports
- Personal Care
- Gifts
- Insurance
- Other

**Note**: Can only be run once. Returns 400 if categories already exist.

---

### Notification Routes
Base: `/api/notifications`

#### Get Notifications
```http
GET /api/notifications?limit=50&skip=0&unreadOnly=false
```

**Access**: Private

**Query Parameters**:
- `limit` (optional, default: 50): Number of notifications to return
- `skip` (optional, default: 0): Number to skip for pagination
- `unreadOnly` (optional, default: false): Filter unread only

**Response** (200):
```json
{
  "notifications": [
    {
      "_id": "notif123",
      "recipient": "user123",
      "sender": {
        "_id": "user456",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "avatar": ""
      },
      "type": "EXPENSE_ADDED",
      "message": "Jane Smith added \"Dinner\" - you owe 50",
      "relatedId": "expense123",
      "relatedModel": "Expense",
      "read": false,
      "metadata": {
        "amount": 50,
        "groupName": "Roommates"
      },
      "createdAt": "2026-01-04T20:00:00.000Z",
      "updatedAt": "2026-01-04T20:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 125,
    "limit": 50,
    "skip": 0,
    "hasMore": true
  }
}
```

**Notification Types**:
- EXPENSE_ADDED
- PAYMENT_RECEIVED
- PAYMENT_VERIFIED
- PAYMENT_DISPUTED
- REMINDER
- GROUP_INVITE

---

#### Get Unread Count
```http
GET /api/notifications/unread/count
```

**Access**: Private

**Response** (200):
```json
{
  "count": 5
}
```

---

#### Mark as Read
```http
PUT /api/notifications/:id/read
```

**Access**: Private

**Response** (200): Updated notification object

---

#### Mark All as Read
```http
PUT /api/notifications/read-all
```

**Access**: Private

**Response** (200):
```json
{
  "message": "All notifications marked as read",
  "modifiedCount": 12
}
```

---

#### Delete Notification
```http
DELETE /api/notifications/:id
```

**Access**: Private

**Response** (200):
```json
{
  "message": "Notification deleted"
}
```

---

#### Delete All Notifications
```http
DELETE /api/notifications
```

**Access**: Private

**Response** (200):
```json
{
  "message": "All notifications deleted",
  "deletedCount": 45
}
```

---

#### Delete Read Notifications
```http
DELETE /api/notifications/read
```

**Access**: Private

**Response** (200):
```json
{
  "message": "Read notifications deleted",
  "deletedCount": 32
}
```

---

### ImageKit Routes
Base: `/api/imagekit`

#### Get ImageKit Auth Parameters
```http
GET /api/imagekit/auth
```

**Access**: Private

**Response** (200):
```json
{
  "signature": "...",
  "expire": 1704398400,
  "token": "..."
}
```

**Usage**: Frontend uses these parameters to authenticate direct uploads to ImageKit.

---

## Data Models

### User
```typescript
{
  _id: ObjectId,
  name: string,
  email: string (unique, lowercase),
  password: string (hashed),
  avatar: string (ImageKit URL),
  isAdmin: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Group
```typescript
{
  _id: ObjectId,
  name: string,
  currency: string (uppercase, default: "USD"),
  icon: string | null,
  image: string | null (ImageKit URL),
  members: ObjectId[] (User refs),
  pendingMembers: [{
    email: string (lowercase),
    name: string,
    invitedBy: ObjectId (User ref),
    invitedAt: Date
  }],
  createdBy: ObjectId (User ref),
  createdAt: Date,
  updatedAt: Date
}
```

### Expense
```typescript
{
  _id: ObjectId,
  description: string,
  amount: number (min: 0),
  date: Date,
  group: ObjectId (Group ref),
  category: ObjectId | null (Category ref),
  type: "EXPENSE" | "PAYMENT",
  payer: ObjectId (User ref),
  receiver: ObjectId | null (User ref, for PAYMENT type),
  paymentDetails: {
    method: "CASH" | "BANK_TRANSFER" | "UPI" | "CREDIT_CARD" | "DEBIT_CARD" | "PAYPAL" | "VENMO" | "OTHER",
    transactionId: string | null,
    remarks: string | null,
    recordedBy: ObjectId | null (User ref)
  },
  verification: {
    isVerified: boolean,
    verifiedBy: ObjectId | null (User ref),
    verifiedAt: Date | null,
    status: "PENDING" | "ACCEPTED" | "DISPUTED"
  },
  receiptImage: string | null (ImageKit URL),
  splits: [{
    user: ObjectId | null (User ref),
    email: string | null (for pending members),
    name: string | null (for pending members),
    amount: number,
    isPending: boolean
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Category
```typescript
{
  _id: ObjectId,
  name: string,
  icon: string,
  type: "expense" | "income",
  createdBy: ObjectId | null (User ref, null for global),
  createdAt: Date,
  updatedAt: Date
}
```

### Notification
```typescript
{
  _id: ObjectId,
  recipient: ObjectId (User ref),
  sender: ObjectId (User ref),
  type: "EXPENSE_ADDED" | "PAYMENT_RECEIVED" | "PAYMENT_VERIFIED" | "PAYMENT_DISPUTED" | "REMINDER" | "GROUP_INVITE",
  message: string,
  relatedId: ObjectId | null,
  relatedModel: "Expense" | "Group" | "Payment" | null,
  read: boolean,
  metadata: Mixed,
  createdAt: Date,
  updatedAt: Date
}
```

### PendingMember
```typescript
{
  _id: ObjectId,
  email: string (lowercase),
  name: string,
  invitedBy: ObjectId (User ref),
  groups: ObjectId[] (Group refs),
  status: "pending" | "registered",
  createdAt: Date,
  updatedAt: Date
}
```

---

## Common Workflows

### 1. User Registration with Pending Invitations

```
1. User invited to group as pending member:
   POST /api/groups/:id/members
   { "email": "newuser@example.com", "name": "New User" }

2. Expenses created with pending member splits

3. Pending user registers:
   POST /api/auth/register
   { "name": "New User", "email": "newuser@example.com", "password": "..." }

4. Backend automatically:
   - Converts pending memberships to real memberships
   - Updates all expense splits from email to userId
   - Returns groups joined count

5. User can now:
   - View all groups they were invited to
   - See accurate balances
   - Participate fully
```

### 2. Creating and Splitting an Expense

```
1. Get group members:
   GET /api/groups/:id

2. Create expense with splits:
   POST /api/expenses
   {
     "description": "Dinner",
     "amount": 150,
     "group": "group123",
     "splits": [
       { "user": "user1", "amount": 50 },
       { "user": "user2", "amount": 50 },
       { "email": "pending@example.com", "name": "Pending", "amount": 50 }
     ]
   }

3. Notifications sent to all split members (except payer)

4. View balances:
   GET /api/groups/:id/balances
```

### 3. Settlement Workflow

```
1. Check who owes whom:
   GET /api/groups/:id/balances

2. Record payment:
   POST /api/expenses/settle
   {
     "group": "group123",
     "payer": "userA",
     "receiver": "userB",
     "amount": 75,
     "paymentMethod": "UPI",
     "transactionId": "TXN123"
   }

3. Receiver gets notification

4. Receiver verifies:
   PUT /api/expenses/:paymentId/verify
   { "status": "ACCEPTED" }

5. Payer gets confirmation notification

6. Updated balances reflect settlement:
   GET /api/groups/:id/balances
```

### 4. Managing Categories

```
1. One-time setup (seed defaults):
   POST /api/categories/seed

2. Get all categories:
   GET /api/categories

3. Create custom category:
   POST /api/categories
   { "name": "Coffee", "icon": "fas fa-coffee" }

4. Use in expense:
   POST /api/expenses
   { ..., "category": "categoryId" }
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "message": "Error description"
}
```

### Common HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Missing required fields, validation failed |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server-side error |

### Example Error Responses

**Missing Token**:
```json
{
  "message": "Not authorized, no token"
}
```

**Invalid Credentials**:
```json
{
  "message": "Invalid credentials"
}
```

**Validation Error**:
```json
{
  "message": "Please provide all required fields"
}
```

**Authorization Error**:
```json
{
  "message": "Not authorized to update this group"
}
```

**Not Found**:
```json
{
  "message": "Group not found"
}
```

---

## Rate Limiting & Best Practices

### Recommendations
1. **Store JWT securely**: Use httpOnly cookies or secure storage
2. **Refresh tokens**: Tokens expire after 30 days
3. **Batch operations**: Use pagination for notifications
4. **Image uploads**: Use ImageKit direct upload with auth parameters
5. **Error handling**: Always check response status codes
6. **Balance calculations**: Refresh after expense/payment operations
7. **Pending members**: Validate email format before inviting

### Performance Tips
- Use query parameters for filtering (unreadOnly, limit, skip)
- Populate only needed fields in responses
- Cache category data (changes infrequently)
- Implement debouncing for search endpoints

---