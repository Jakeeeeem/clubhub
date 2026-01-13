# 🗺️ ROADMAP TO 100% - FINAL 20%

**Current Status:** 80% Complete  
**Target:** 100% Complete  
**Time Required:** ~30 hours  
**Approach:** Build missing UIs, add small features, test & polish

---

## 📋 **PHASE 1: CRITICAL UIs (15 hours)**

### **Priority 1: Venue Booking UI (3 hours)**
**Status:** Backend 100%, Frontend 0%  
**Files to Create:**
- `frontend/venue-booking.html` - Main venue booking page
- Add to admin dashboard navigation

**Features:**
- List all venues
- View venue details
- Check availability calendar
- Book venue form
- My bookings list

**API Endpoints (Already Exist):**
- GET /api/venues
- GET /api/venues/:id/availability
- POST /api/venues/:id/book
- GET /api/venues/bookings/my

---

### **Priority 2: League Management UI (4 hours)**
**Status:** Backend 100%, Frontend 0%  
**Files to Create:**
- `frontend/league-management.html` - League dashboard
- Add to admin dashboard navigation

**Features:**
- Create league form
- Add teams to league
- Auto-generate fixtures button
- View fixtures table
- Enter scores
- View standings table
- Assign referees

**API Endpoints (Already Exist):**
- POST /api/leagues
- POST /api/leagues/:id/teams
- POST /api/leagues/:id/fixtures/generate
- GET /api/leagues/:id/fixtures
- PUT /api/leagues/fixtures/:id/score
- GET /api/leagues/:id/standings

---

### **Priority 3: Training Schedule Builder (3 hours)**
**Status:** Backend 100%, Frontend 0%  
**Files to Create:**
- `frontend/training-manager.html` - Training event manager
- Add to admin dashboard navigation

**Features:**
- Create training groups
- Batch add bibs
- Create schedule items (SSG, 11v11, etc.)
- Auto-assign players to groups
- View registrations
- Check-in interface

**API Endpoints (Already Exist):**
- POST /api/talent-id/events/:id/groups
- POST /api/talent-id/bibs/batch
- POST /api/talent-id/events/:id/schedule
- POST /api/talent-id/events/:id/auto-assign
- GET /api/talent-id/events/:id/dashboard

---

### **Priority 4: Tournament Brackets UI (3 hours)**
**Status:** Backend 100%, Frontend 0%  
**Files to Create:**
- `frontend/tournament-manager.html` - Tournament dashboard
- Add to admin dashboard navigation

**Features:**
- View team registrations
- Approve/reject teams
- Generate fixtures (knockout/league)
- View bracket visualization
- Enter match results
- Team check-in

**API Endpoints (Already Exist):**
- GET /api/tournaments/:id/dashboard
- POST /api/tournaments/:id/generate-fixtures
- POST /api/tournaments/matches/:id/result
- POST /api/tournaments/teams/:id/status

---

### **Priority 5: Email Marketing UI (2 hours)**
**Status:** Backend 50%, Frontend 0%  
**Files to Create:**
- `frontend/email-campaigns.html` - Campaign builder
- Add to admin dashboard navigation

**Features:**
- Create campaign form
- Select segments (all players, on plan, etc.)
- Email template editor
- Send campaign
- View campaign history

**Backend Needed:**
- POST /api/campaigns
- POST /api/campaigns/:id/send
- GET /api/campaigns

---

## 📋 **PHASE 2: SMALL FEATURES (5 hours)**

### **Feature 1: Voting System (2 hours)**
**Files:**
- Database migration for polls table
- Backend: `routes/polls.js`
- Frontend: Add to events/teams

**Implementation:**
- Create polls table
- POST /api/polls (create poll)
- POST /api/polls/:id/vote
- GET /api/polls/:id/results
- UI: Poll creation form
- UI: Vote submission
- UI: Results display

---

### **Feature 2: Location Validation (1 hour)**
**Files:**
- Add to check-in functionality

**Implementation:**
- Use browser Geolocation API
- Calculate distance from venue
- Allow/deny check-in based on proximity
- Add to event check-in UI

---

### **Feature 3: Document Uploads (1 hour)**
**Files:**
- Add to venues

**Implementation:**
- File upload endpoint
- Store in /uploads directory
- Link to venue
- Download links in venue details

---

### **Feature 4: Image Upload Limits (30 min)**
**Files:**
- Modify existing upload handlers

**Implementation:**
- Add validation: max 5 images
- Return error if exceeded
- Show count in UI

---

### **Feature 5: Coach Team Scoping (30 min)**
**Files:**
- Modify team queries

**Implementation:**
- Add coach_id filter to team endpoints
- Restrict dashboard view
- Show only assigned teams

---

## 📋 **PHASE 3: TESTING & POLISH (10 hours)**

### **Testing (5 hours)**
1. Run all migrations
2. Test each API endpoint
3. Test each frontend feature
4. Fix bugs
5. Integration testing

### **UI Polish (3 hours)**
1. Consistent styling
2. Loading states
3. Error handling
4. Success messages
5. Responsive design

### **Performance (2 hours)**
1. Optimize queries
2. Add indexes
3. Cache where needed
4. Minify assets

---

## 🎯 **EXECUTION PLAN**

### **Session 1 (Today - 4 hours):**
- ✅ Create roadmap
- 🔄 Build Venue Booking UI
- 🔄 Build League Management UI

### **Session 2 (Tomorrow - 4 hours):**
- Build Training Schedule UI
- Build Tournament Brackets UI
- Build Email Marketing UI

### **Session 3 (Day 3 - 3 hours):**
- Add Voting System
- Add Location Validation
- Add Document Uploads
- Add Image Limits
- Add Coach Scoping

### **Session 4 (Day 4 - 3 hours):**
- Run migrations
- Test all features
- Fix bugs

### **Session 5 (Day 5 - 2 hours):**
- UI polish
- Performance optimization
- Final testing

---

## 📊 **PROGRESS TRACKING**

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| Phase 1 | 5 UIs | 15h | 🔄 Starting |
| Phase 2 | 5 Features | 5h | ⏳ Pending |
| Phase 3 | Testing | 10h | ⏳ Pending |
| **Total** | **15 items** | **30h** | **0% → 100%** |

---

## 🚀 **STARTING NOW!**

**First Task:** Venue Booking UI  
**Time:** 3 hours  
**Let's build it!**
