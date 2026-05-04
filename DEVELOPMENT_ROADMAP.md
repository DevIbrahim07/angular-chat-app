# Real-Time Chat Application - Development Roadmap

**Project Path:** `d:/ANGULAR_PROJECTS/angular-chat-app`  
**Start Date:** April 30, 2026  
**Status:** Phase 0 (Live Messaging - COMPLETE)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current Architecture](#current-architecture)
3. [Code Flow Explanation](#code-flow-explanation)
4. [Phase-Based Implementation Plan](#phase-based-implementation-plan)
5. [Testing Strategy](#testing-strategy)

---

## Project Overview

A real-time chat application built with:

- **Backend:** Node.js + Express + Socket.IO + MongoDB (Mongoose)
- **Frontend:** Angular 21 (Standalone Components) + RxJS + Tailwind CSS
- **Real-Time Communication:** Socket.IO for WebSocket bidirectional messaging
- **Database:** MongoDB for persistent message storage

**End Goal:** Fully functional real-time chat app with authentication, multiple users, conversations, online status, typing indicators, and message features.

---

## Current Architecture

### Backend Stack (`d:/ANGULAR_PROJECTS/angular-chat-app/backend`)

```
server.js
├── Entry point
├── Creates HTTP server
├── Connects MongoDB via MONGO_URI
└── Initializes Socket.IO

app.js
├── Express app setup
├── CORS & JSON middleware
└── Routes mounting (/api)

modules/chat/
├── chat.routes.js        (REST endpoints)
├── chat.controller.js    (HTTP logic)
└── chat.socket.js        (Socket.IO events)

models/
└── Message.model.js      (Mongoose schema)

config/
└── db.js                 (MongoDB connection)
```

**Key Dependencies:**

```json
{
  "express": "^5.2.1",
  "mongoose": "^9.5.0",
  "socket.io": "^4.8.3",
  "cors": "^2.8.6",
  "dotenv": "^17.4.2"
}
```

### Frontend Stack (`d:/ANGULAR_PROJECTS/angular-chat-app/frontend`)

```
src/
├── main.ts               (Bootstrap)
├── styles.css            (Global - Tailwind)
└── app/
    ├── app.ts            (Root component)
    ├── app.routes.ts     (Routing - empty)
    ├── app.config.ts     (Config - providers)
    ├── app.html          (Root template)
    │
    ├── core/
    │   └── services/
    │       ├── chat.ts           (HTTP service for messages)
    │       └── socket-service.ts (Socket.IO wrapper)
    │
    ├── features/chat/
    │   ├── pages/
    │   │   └── chat-page/        (Main container)
    │   └── components/
    │       ├── message-list/     (List wrapper)
    │       ├── message-item/     (Individual message)
    │       └── message-input/    (Send input)
    │
    └── models/
        └── message.model.ts      (TypeScript interface)
```

**Key Dependencies:**

```json
{
  "@angular/core": "^21.2.0",
  "@angular/forms": "^21.2.0",
  "socket.io-client": "^4.8.3",
  "rxjs": "~7.8.0",
  "tailwindcss": "^4.1.12"
}
```

---

## Code Flow Explanation

### Message Send Flow (Current)

```
User Types Message
        ↓
MessageInput.onSend() emits message text
        ↓
ChatPage.send() creates MessageModel with clientId
        ↓
Messages signal.update() adds to local state (optimistic)
        ↓
SocketService.sendMessage() emits to backend
        ↓
Backend chat.socket.js receives 'sendMessage'
        ↓
Message.create() saves to MongoDB
        ↓
io.emit('receiveMessage', savedMessage) broadcasts
        ↓
Frontend receiveMessage subscription
        ↓
Messages signal.update() replaces clientId entry with _id
        ↓
@for loop in message-list.html re-renders
        ↓
Message appears in UI (with animation)
```

### Key Components & Their Role

| Component         | Responsibility                                        | State                  |
| ----------------- | ----------------------------------------------------- | ---------------------- |
| **ChatPage**      | Orchestrate message flow, load history, manage socket | `messages` signal      |
| **MessageInput**  | Capture & emit user input                             | Local `message` string |
| **MessageList**   | Iterate messages, track by clientId/\_id              | @Input `messages`      |
| **MessageItem**   | Display individual message, align (own/other)         | @Input `message`       |
| **SocketService** | Wrap Socket.IO, expose Observables                    | Private `socket`       |
| **Chat Service**  | GET /api/messages for history                         | HttpClient             |

### Database Schema (Current)

**Message Collection:**

```javascript
{
  _id: ObjectId,
  clientId: String,        // Temp ID for optimistic render
  sender: String,          // 'Ibrahim' (hardcoded now)
  message: String,         // Message content
  createdAt: Date          // Default: now()
}
```

---

## Phase-Based Implementation Plan

### Phase 0: Live Messaging ✅ COMPLETE

**What's Done:**

- Real-time message sending & receiving via Socket.IO
- Persistent storage in MongoDB
- Optimistic UI update with clientId tracking
- Auto-scroll to latest message
- Standalone components setup

**Current Limitations:**

- No user authentication (hardcoded sender: 'Ibrahim')
- Single shared conversation
- No user awareness (who's online)
- No conversation management

---

### Phase 1: User Authentication & Login

**Goal:** Allow users to sign up, log in, and persist sessions.

#### Backend Changes

**Files to Modify/Create:**

1. `backend/models/User.model.js` (NEW)
2. `backend/modules/auth/` (NEW FOLDER)
   - `auth.controller.js`
   - `auth.routes.js`
   - `auth.service.js`
3. `backend/middleware/authMiddleware.js` (NEW)
4. `backend/.env` (UPDATE)
5. `backend/app.js` (UPDATE)

**Backend Tasks:**

- [ ] Install dependencies: `jsonwebtoken`, `bcryptjs`, `validator`
- [ ] Create User schema with email, password (hashed), username
- [ ] Create auth controller with signup, login, refresh endpoints
- [ ] Implement JWT token generation & verification
- [ ] Add auth routes: POST /api/auth/signup, POST /api/auth/login, POST /api/auth/refresh
- [ ] Create auth middleware to protect routes
- [ ] Update Message schema to reference User.\_id instead of string sender
- [ ] Add JWT_SECRET to .env file

**Backend Endpoints:**

```
POST /api/auth/signup
  Body: { email, username, password }
  Response: { token, refreshToken, user }

POST /api/auth/login
  Body: { email, password }
  Response: { token, refreshToken, user }

POST /api/auth/refresh
  Body: { refreshToken }
  Response: { token }
```

#### Frontend Changes

**Files to Modify/Create:**

1. `frontend/src/app/features/auth/` (NEW FOLDER)
   - `login/login.ts` (component)
   - `signup/signup.ts` (component)
   - `login.html`, `login.css`
   - `signup.html`, `signup.css`
2. `frontend/src/app/core/services/auth.service.ts` (NEW)
3. `frontend/src/app/core/guards/auth.guard.ts` (NEW)
4. `frontend/src/app/core/interceptors/auth.interceptor.ts` (NEW)
5. `frontend/src/app/app.routes.ts` (UPDATE)
6. `frontend/src/app/app.ts` (UPDATE)
7. `frontend/src/app/app.config.ts` (UPDATE)
8. `frontend/src/models/user.model.ts` (NEW)

**Frontend Tasks:**

- [ ] Create Auth service with signup/login methods
- [ ] Create Login component with email/password form
- [ ] Create Signup component with email/username/password form
- [ ] Implement AuthGuard to protect chat route
- [ ] Create Auth interceptor to attach token to requests
- [ ] Store JWT token in localStorage
- [ ] Update app.routes.ts with /login, /signup, /chat routes
- [ ] Redirect unauthenticated users to login
- [ ] Add logout button in chat page
- [ ] Display current username in chat page header

**Frontend Models:**

```typescript
// user.model.ts
export interface User {
  _id: string;
  email: string;
  username: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}
```

#### Testing Checklist

- [ ] Signup with new account → Token received & stored
- [ ] Login with valid credentials → Token received
- [ ] Login with invalid credentials → Error message shown
- [ ] Token stored in localStorage
- [ ] Page refresh → User remains logged in
- [ ] Access /chat without token → Redirected to /login
- [ ] Send message as authenticated user → Sender is username, not 'Ibrahim'
- [ ] Logout → Token cleared, redirected to login

#### Expected Outcome

Users can create accounts and log in. Messages show sender as username. Chat route protected by authentication.

---

### Phase 2: User Profiles & Online Status

**Goal:** Display user profiles and show who's online in real-time.

#### Backend Changes

**Files to Modify/Create:**

1. `backend/models/User.model.js` (UPDATE)
2. `backend/modules/users/users.controller.js` (NEW)
3. `backend/modules/users/users.routes.js` (NEW)
4. `backend/modules/chat/chat.socket.js` (UPDATE)

**Backend Tasks:**

- [ ] Add `status` (online/offline) and `lastSeen` to User schema
- [ ] Add `profile` object (avatar, bio, displayName) to User schema
- [ ] Create GET /api/users endpoint (get all users)
- [ ] Create GET /api/users/:id endpoint (get single user profile)
- [ ] Create PUT /api/users/:id endpoint (update profile)
- [ ] On Socket.IO connection → update user status to 'online'
- [ ] On Socket.IO disconnect → update user status to 'offline', set lastSeen
- [ ] Emit 'userStatusChanged' event when status changes
- [ ] Emit 'usersList' event on connection with all users

**Socket.IO Events:**

```javascript
// Emit to client
'userStatusChanged' → { userId, status, lastSeen }
'usersList' → [{ _id, username, status, lastSeen }, ...]

// Listen from client
'getUsersList'
```

#### Frontend Changes

**Files to Modify/Create:**

1. `frontend/src/app/features/chat/components/user-list/` (NEW)
   - `user-list.ts`
   - `user-list.html`
   - `user-list.css`
2. `frontend/src/app/features/profile/` (NEW)
   - `profile.ts` (component)
   - `profile.html`, `profile.css`
3. `frontend/src/app/core/services/users.service.ts` (NEW)
4. `frontend/src/app/core/services/socket-service.ts` (UPDATE)
5. `frontend/src/app/models/user.model.ts` (UPDATE)
6. `frontend/src/app/features/chat/pages/chat-page/chat-page.ts` (UPDATE)

**Frontend Tasks:**

- [ ] Create UsersService to fetch/manage users
- [ ] Update SocketService to emit/listen for 'userStatusChanged', 'usersList'
- [ ] Create user-list component to display online users
- [ ] Show green dot for online, gray for offline
- [ ] Add sidebar with user list
- [ ] Create profile page to view/edit user info
- [ ] Update chat header to show current username & logout option
- [ ] Listen for status changes and update UI in real-time

**Frontend Models:**

```typescript
// Update user.model.ts
export interface User {
  _id: string;
  email: string;
  username: string;
  status: "online" | "offline";
  lastSeen: string;
  profile?: {
    avatar?: string;
    bio?: string;
    displayName?: string;
  };
  createdAt: string;
}
```

#### Testing Checklist

- [ ] Open chat app in 2 tabs → See both users in user list with 'online' status
- [ ] Close one tab → Other tab shows user as 'offline'
- [ ] Click on user profile → See user info
- [ ] Update profile in edit page → Changes reflected
- [ ] Status changes reflected in real-time across all connected clients
- [ ] Restart server → Users revert to 'offline'

#### Expected Outcome

Users can see who's online, view profiles, update their info. Real-time status updates.

---

### Phase 3: Multiple Conversations/Rooms

**Goal:** Support multiple conversations instead of one shared chat.

#### Backend Changes

**Files to Modify/Create:**

1. `backend/models/Conversation.model.js` (NEW)
2. `backend/modules/conversations/conversations.controller.js` (NEW)
3. `backend/modules/conversations/conversations.routes.js` (NEW)
4. `backend/models/Message.model.js` (UPDATE)
5. `backend/modules/chat/chat.socket.js` (UPDATE)
6. `backend/app.js` (UPDATE)

**Backend Tasks:**

- [ ] Create Conversation schema with participants array, name, createdAt, lastMessage
- [ ] Add conversationId to Message schema
- [ ] Create POST /api/conversations (create new conversation)
- [ ] Create GET /api/conversations (get user's conversations)
- [ ] Create GET /api/conversations/:id/messages (get messages in conversation)
- [ ] Create PUT /api/conversations/:id (update conversation)
- [ ] Create DELETE /api/conversations/:id (delete conversation)
- [ ] Update Socket.IO to join rooms based on conversationId
- [ ] Update 'sendMessage' to include conversationId
- [ ] Update 'receiveMessage' to broadcast only to that conversation room
- [ ] Add 'joinConversation' event to join specific room
- [ ] Add 'leaveConversation' event to leave room

**Socket.IO Events:**

```javascript
// Listen from client
'joinConversation' → conversationId
'leaveConversation' → conversationId
'sendMessage' → { conversationId, message, ... }

// Emit to client (to specific room)
'receiveMessage' → message
'conversationsList' → [conversations...]
```

#### Frontend Changes

**Files to Modify/Create:**

1. `frontend/src/app/features/chat/pages/conversations/` (NEW)
   - `conversations.ts` (list component)
   - `conversations.html`, `conversations.css`
2. `frontend/src/app/features/chat/pages/chat-page/` (REFACTOR)
   - Update to accept conversationId param
3. `frontend/src/app/core/services/conversation.service.ts` (NEW)
4. `frontend/src/app/core/services/socket-service.ts` (UPDATE)
5. `frontend/src/app/models/conversation.model.ts` (NEW)
6. `frontend/src/app/app.routes.ts` (UPDATE)

**Frontend Tasks:**

- [ ] Create ConversationService with CRUD methods
- [ ] Create conversations list page to show all user's conversations
- [ ] Add route param for conversationId
- [ ] Update ChatPage to load messages for specific conversation
- [ ] Emit 'joinConversation' when entering chat page
- [ ] Emit 'leaveConversation' when leaving
- [ ] Update socket message emit to include conversationId
- [ ] Create button to start new conversation (select users)
- [ ] Show last message preview in conversation list
- [ ] Real-time update conversation list when new messages arrive

**Frontend Models:**

```typescript
// conversation.model.ts
export interface Conversation {
  _id: string;
  participants: User[];
  name?: string;
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
}
```

#### Testing Checklist

- [ ] Create new conversation with another user → Appears in list
- [ ] Send message in conversation 1 → Only visible in that conversation
- [ ] Open conversation 2 → Messages from conv1 not shown
- [ ] Open 2 conversations in different tabs → Real-time sync
- [ ] Add 3rd user to conversation → They see all messages
- [ ] Delete conversation → Removed from all participants' lists
- [ ] Conversation last message updates in real-time

#### Expected Outcome

Support multiple conversations, each with separate message histories. Users can create and manage conversations.

---

### Phase 4: User List & Add Contacts

**Goal:** Allow users to search, add, and manage contacts.

#### Backend Changes

**Files to Modify/Create:**

1. `backend/models/Contact.model.js` (NEW)
2. `backend/modules/contacts/contacts.controller.js` (NEW)
3. `backend/modules/contacts/contacts.routes.js` (NEW)
4. `backend/app.js` (UPDATE)

**Backend Tasks:**

- [ ] Create Contact schema with userId, contactId, addedAt
- [ ] Create POST /api/contacts (add contact)
- [ ] Create GET /api/contacts (get user's contacts)
- [ ] Create DELETE /api/contacts/:id (remove contact)
- [ ] Create GET /api/users/search?query=name (search users)
- [ ] Add auth middleware to all contact endpoints

#### Frontend Changes

**Files to Modify/Create:**

1. `frontend/src/app/features/contacts/` (NEW FOLDER)
   - `contact-list.ts` (component)
   - `contact-list.html`, `contact-list.css`
   - `add-contact.ts` (modal/component)
2. `frontend/src/app/core/services/contacts.service.ts` (NEW)
3. `frontend/src/app/features/chat/pages/conversations/conversations.ts` (UPDATE)

**Frontend Tasks:**

- [ ] Create ContactsService for CRUD
- [ ] Create contact-list component
- [ ] Create add-contact component with search
- [ ] Add button to start new conversation from contacts
- [ ] Show contacts in sidebar
- [ ] Real-time sync when contacts are added/removed
- [ ] Search functionality for finding users

#### Testing Checklist

- [ ] Add user as contact → Appears in contact list
- [ ] Search for user → Results show
- [ ] Start new conversation with contact → Conversation created
- [ ] Remove contact → No longer in list
- [ ] Contact appears in 2 clients in real-time

#### Expected Outcome

Users can search for and manage contacts. Easier conversation creation.

---

### Phase 5: Typing Indicators

**Goal:** Show when users are typing in real-time.

#### Backend Changes

**Files to Modify/Create:**

1. `backend/modules/chat/chat.socket.js` (UPDATE)

**Backend Tasks:**

- [ ] Add 'userTyping' event listener
- [ ] Broadcast 'userIsTyping' to conversation room
- [ ] Add 'stopTyping' event listener
- [ ] Broadcast 'userStoppedTyping' to room
- [ ] Auto-stop typing after 5 seconds of inactivity

#### Frontend Changes

**Files to Modify/Create:**

1. `frontend/src/app/features/chat/pages/chat-page/chat-page.ts` (UPDATE)
2. `frontend/src/app/features/chat/pages/chat-page/chat-page.html` (UPDATE)
3. `frontend/src/app/features/chat/components/message-input/message-input.ts` (UPDATE)
4. `frontend/src/app/core/services/socket-service.ts` (UPDATE)

**Frontend Tasks:**

- [ ] Emit 'userTyping' event on input keydown
- [ ] Emit 'stopTyping' on Enter or input blur
- [ ] Listen for 'userIsTyping' and 'userStoppedTyping'
- [ ] Show "User is typing..." indicator at bottom of chat
- [ ] Display typing users' names/avatars
- [ ] Clear typing indicator after message received

#### Testing Checklist

- [ ] Type in one tab → See "typing..." in other tab
- [ ] Stop typing → Indicator disappears
- [ ] Send message → Typing indicator cleared
- [ ] Multiple users typing → Show all names

#### Expected Outcome

Real-time typing indicators for better UX.

---

### Phase 6: Read Receipts & Message Status

**Goal:** Show message delivery and read status.

#### Backend Changes

**Files to Modify/Create:**

1. `backend/models/Message.model.js` (UPDATE)
2. `backend/modules/chat/chat.socket.js` (UPDATE)

**Backend Tasks:**

- [ ] Add `status` field to Message (sent, delivered, read)
- [ ] Add `readBy` array to track who read the message
- [ ] Create 'markAsRead' event listener
- [ ] Update message status to 'read' with timestamp
- [ ] Broadcast 'messageRead' event to conversation

#### Frontend Changes

**Files to Modify/Create:**

1. `frontend/src/app/features/chat/components/message-item/message-item.ts` (UPDATE)
2. `frontend/src/app/features/chat/components/message-item/message-item.html` (UPDATE)
3. `frontend/src/app/features/chat/pages/chat-page/chat-page.ts` (UPDATE)
4. `frontend/src/app/core/services/socket-service.ts` (UPDATE)
5. `frontend/src/app/models/message.model.ts` (UPDATE)

**Frontend Tasks:**

- [ ] Add status icons to messages (✓ sent, ✓✓ delivered, ✓✓ read)
- [ ] Emit 'markAsRead' when message comes into view
- [ ] Use Intersection Observer to detect visible messages
- [ ] Update message UI when read receipts received
- [ ] Show "read by" info on hover/click

#### Testing Checklist

- [ ] Send message → Shows sent icon
- [ ] Message received → Shows delivered icon
- [ ] Other user sees message → Shows read icon
- [ ] Hover on message → Shows "Read by User1, User2"

#### Expected Outcome

Users know message delivery and read status.

---

### Phase 7: Notifications & Unread Badges

**Goal:** Notify users of new messages and show unread counts.

#### Backend Changes

**Files to Modify/Create:**

1. `backend/models/Conversation.model.js` (UPDATE)

**Backend Tasks:**

- [ ] Add `unreadCount` tracking per user per conversation
- [ ] Update unread count on new message
- [ ] Reset to 0 when user marks as read

#### Frontend Changes

**Files to Modify/Create:**

1. `frontend/src/app/features/chat/pages/conversations/conversations.ts` (UPDATE)
2. `frontend/src/app/features/chat/pages/conversations/conversations.html` (UPDATE)
3. `frontend/src/app/core/services/socket-service.ts` (UPDATE)

**Frontend Tasks:**

- [ ] Request browser notification permission on load
- [ ] Show unread badge on conversation items
- [ ] Send browser notification on new message if tab inactive
- [ ] Sound notification option
- [ ] Clear unread when conversation opened

#### Testing Checklist

- [ ] Receive message in background tab → Browser notification shown
- [ ] Unread count shows on conversation → Updates in real-time
- [ ] Open conversation → Unread count resets

#### Expected Outcome

Users get notified of new messages even when not actively in chat.

---

### Phase 8: Message Search & Filters

**Goal:** Allow users to search and filter messages.

#### Backend Changes

**Files to Modify/Create:**

1. `backend/modules/conversations/conversations.controller.js` (UPDATE)

**Backend Tasks:**

- [ ] Create GET /api/conversations/:id/messages/search?q=term
- [ ] Implement text search on message content
- [ ] Add date range filtering
- [ ] Add sender filtering

#### Frontend Changes

**Files to Modify/Create:**

1. `frontend/src/app/features/chat/components/message-search/` (NEW)
2. `frontend/src/app/features/chat/pages/chat-page/chat-page.ts` (UPDATE)

**Frontend Tasks:**

- [ ] Create search component with input & filters
- [ ] Implement search functionality
- [ ] Highlight search results in messages
- [ ] Filter by date range
- [ ] Filter by sender

#### Testing Checklist

- [ ] Search for keyword → Relevant messages highlighted
- [ ] Filter by date → Only messages in range shown
- [ ] Filter by sender → Only that user's messages shown

#### Expected Outcome

Users can easily find messages in conversations.

---

### Phase 9: Emoji & File Sharing

**Goal:** Allow users to send emoji reactions and share files.

#### Backend Changes

**Files to Modify/Create:**

1. `backend/models/Message.model.js` (UPDATE)
2. `backend/modules/chat/chat.socket.js` (UPDATE)
3. `backend/middleware/upload.js` (NEW)

**Backend Tasks:**

- [ ] Add `reactions` array to Message (emoji, userId)
- [ ] Add `attachments` array to Message
- [ ] Setup file upload (local or cloud storage)
- [ ] Create POST /api/upload endpoint
- [ ] Add 'addReaction' socket event
- [ ] Broadcast 'reactionAdded' event
- [ ] Validate file size/type

#### Frontend Changes

**Files to Modify/Create:**

1. `frontend/src/app/features/chat/components/message-input/message-input.ts` (UPDATE)
2. `frontend/src/app/features/chat/components/message-item/message-item.ts` (UPDATE)
3. `frontend/src/app/core/services/upload.service.ts` (NEW)

**Frontend Tasks:**

- [ ] Add emoji picker to input
- [ ] Add file upload button
- [ ] Show loading while uploading
- [ ] Display file attachments in messages
- [ ] Show emoji reactions on messages
- [ ] Add button to react to messages

#### Testing Checklist

- [ ] Upload file → Appears in message with download link
- [ ] Add emoji reaction → Shows on message in real-time
- [ ] Other user sees reactions instantly

#### Expected Outcome

Rich messaging with emoji and file support.

---

### Phase 10: Production Ready & Polish

**Goal:** Ensure app is secure, performant, and production-ready.

#### Backend Tasks

- [ ] Implement rate limiting on API endpoints
- [ ] Add request validation & sanitization
- [ ] Implement HTTPS/SSL
- [ ] Add request logging & monitoring
- [ ] Database indexing on frequently queried fields
- [ ] Message pagination (load 50 at a time)
- [ ] Cleanup old inactive user sessions
- [ ] Error handling & proper status codes
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Environment-based configuration

#### Frontend Tasks

- [ ] Implement lazy loading for conversations
- [ ] Add error boundary components
- [ ] Implement local caching for messages
- [ ] Add dark mode support
- [ ] Responsive design for mobile
- [ ] PWA setup (service workers, offline support)
- [ ] Performance optimization (code splitting, lazy routes)
- [ ] Accessibility improvements (a11y)
- [ ] Unit & E2E tests
- [ ] Error logging & tracking (Sentry)

#### DevOps Tasks

- [ ] Setup Docker containers for backend & frontend
- [ ] CI/CD pipeline (GitHub Actions/GitLab CI)
- [ ] Database backups
- [ ] Monitoring & alerting
- [ ] Load testing

#### Testing Checklist

- [ ] All phases tested thoroughly
- [ ] No N+1 queries in database
- [ ] Messages load in <500ms
- [ ] App works on mobile devices
- [ ] Offline mode partially functional
- [ ] Error messages user-friendly
- [ ] No console errors/warnings

#### Expected Outcome

Production-ready real-time chat application.

---

## Testing Strategy

### Phase Testing Approach

For each phase:

1. **Manual Testing**
   - Test each feature in isolation
   - Test with multiple users (2-3 browser tabs)
   - Test network conditions (slow/offline)
   - Check browser console for errors

2. **Real-Time Testing**
   - Open 2+ browser tabs/windows
   - Test in same conversation vs different
   - Verify real-time updates across all clients
   - Check for race conditions

3. **Data Validation**
   - Verify data saved correctly in MongoDB
   - Check no data loss on disconnect
   - Verify message order (chronological)

4. **Edge Cases**
   - User disconnect/reconnect during message send
   - Rapid message sending (spam)
   - Conversation delete while messages sending
   - Token expiry during session

### Tools Setup

```bash
# Backend testing
npm install --save-dev jest supertest

# Frontend testing
# Already setup: vitest, jasmine

# Manual testing
# Use 2 incognito browser windows
# Use browser DevTools Network throttling
```

---

## Phase Completion Checklist

Use this for each phase completion:

**Phase: **\_****

- [ ] All backend routes implemented & tested
- [ ] All frontend components created & styled
- [ ] Real-time events working across clients
- [ ] Database schema updated
- [ ] No console errors/warnings
- [ ] Manual testing passed with 2+ clients
- [ ] Code committed with clear messages
- [ ] Documented any new environment variables
- [ ] Updated this roadmap with lessons learned
- [ ] Ready for next phase

---

## Quick Command Reference

### Start Backend

```bash
cd backend
npm install
# Create .env with MONGO_URI=mongodb://...
npm run dev
```

### Start Frontend

```bash
cd frontend
npm install
ng serve
# Navigate to http://localhost:4200
```

### Stop Services

```bash
# Backend: Ctrl+C in terminal
# Frontend: Ctrl+C in terminal
```

### Database Access (MongoDB)

```bash
# Using Compass or Atlas
# Connection: mongodb://localhost:27017 (local)
# Or use MongoDB Atlas connection string
```

---

## Notes & Lessons Learned

(Update as you progress through phases)

### Phase 1 Notes

- [ ] (To be filled after Phase 1)

### Phase 2 Notes

- [ ] (To be filled after Phase 2)

...

---

## Stack Versions (Snapshot)

**Taken:** April 30, 2026

- Node.js: v20+ (assumed)
- Angular: 21.2.0
- Express: 5.2.1
- Socket.IO: 4.8.3
- MongoDB: 9.5.0 (Mongoose)
- TypeScript: 5.9.2

---

## References & Documentation

- [Socket.IO Docs](https://socket.io/docs/)
- [Angular 21 Guide](https://angular.dev/)
- [MongoDB Mongoose](https://mongoosejs.com/)
- [Express.js](https://expressjs.com/)
- [RxJS](https://rxjs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Last Updated:** April 30, 2026  
**Status:** Planning Phase (Phase 0 Complete)
