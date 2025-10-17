# CMETRICS - COMPLETE FEATURE SPECIFICATION

## DATA STRUCTURE UNDERSTANDING

### From Excel Analysis:

1. **CM TEAMS (CM teams (1).xlsx)**
   - Team hierarchy: Team > CM Name (agents)
   - Metrics per agent: leads, leads ach%, APP, APP%, Show up, Show up %, Paid, PAIDS ACH
   - Teams: EGLP01, EGLP02, EGLP03, etc.
   - Agents: EGLP-ahmedamrali, EGLP-ahmedsalah, etc.

2. **CLASS CONSUMPTION (CCtest.xlsx)**
   - Per agent metrics: Number_of_students, Avg_class_consumption, Super_class_consumption, etc.
   - Distribution buckets: 0, 1-7, 8-11, 12-14, 15-19, >=20
   - Target: 77%

3. **FIXED RATE (FTtest.xlsx)**
   - Student-level data: Student id, LP Group, LP (agent), Fixed or Not, Number of fixed plans, etc.
   - Needs aggregation per agent

4. **LEADS (1410Leads.xlsx)**
   - 57k+ rows of student data
   - Fields: LP employee group (team), LP employee assigned (agent), student lifecycle data
   - Recovered/Unrecovered lead tracking

5. **UPGRADE RATE ([CM]Middle East...xlsx)**
   - Per agent: M-2 First Purchase, Cumulative Upgrade Students, Upgrade Rate
   - Team totals

## USER ROLES

### 1. SUPER ADMIN
- **Access**: Everything
- **Permissions**:
  - Upload Excel files (all 5 sources)
  - View all teams and all agents
  - Create/edit/delete users
  - Assign teams to Team Leaders
  - Configure global targets
  - Access all analytics

### 2. TEAM LEADER (ADMIN)
- **Access**: Own team(s) only
- **Permissions**:
  - View own team agents as cards
  - View analytics for own team
  - Prepare meeting alerts for underperformers
  - Use AI chat to query own team data
  - Cannot upload files
  - Cannot create users

## REQUIRED FEATURES

### 1. **FILE UPLOAD SYSTEM** (Super Admin only)
   - Tab-based interface with 5 tabs:
     - Class Consumption (CC)
     - Super Class (SC)
     - Upgrade Rate (UP)
     - Fixed Rate (FT)
     - Leads/Referrals (ALL LEADS)
   - Drag & drop Excel upload
   - Preview before import
   - Show import history
   - Validation & error reporting

### 2. **TEAM HIERARCHY & ORGANIZATION**
   - Super Admin sees all teams
   - Team Leaders see only assigned teams
   - Team displayed as expandable cards
   - Each team shows:
     - Team name
     - Team leader name
     - Agent count
     - Team average metrics
     - Expandable to show all agents

### 3. **AGENT CARDS (NOT TABLE!)**
   - Grid of cards (like Instagram/Pinterest)
   - Each card shows:
     - Agent name & ID
     - Team name
     - Rank within team
     - Overall score (weighted)
     - Targets achieved (X/4)
     - 4 metric mini-cards (CC, SC, UP, Fixed) with status colors
     - Student count
     - Lead stats (total, recovered, unrecovered, conversion %)
     - Referral stats (leads generated, showups, paid)
     - Status badge (Above/Warning/Below)
   - Click card → opens detailed agent page

### 4. **AGENT DETAIL PAGE** (Dynamic, not static!)
   - Full-screen agent profile
   - Sections:
     - Header: Name, ID, Team, Rank, Photo placeholder
     - Performance Overview: Large score, targets hit, status
     - Metrics Deep Dive: 4 detailed metric cards with:
       - Current vs Target
       - Gap analysis
       - Trend chart (last 4 weeks)
       - Student distribution (for CC: 0, 1-7, 8-11, 12-14, 15-19, >=20)
     - Lead Management:
       - Total leads table (filterable)
       - Recovered vs Unrecovered breakdown
       - Conversion funnel chart
     - Referral Performance:
       - Leads generated
       - Showup rate
       - Paid conversion rate
     - AI Insights:
       - Why this rank?
       - Strengths
       - Areas for improvement
       - Recommendations

### 5. **MEETING PREPARATION TAB**
   - Purpose: Help leaders prepare for 1-on-1 meetings with underperformers
   - Features:
     - Threshold slider (default: <2 targets hit)
     - Auto-generate list of agents below threshold
     - For each agent:
       - Name, rank, score
       - Which targets are missed
       - Gap for each target
       - AI-generated talking points
       - "Mark as meeting scheduled" button
     - Export meeting list as PDF
     - Calendar integration (optional)

### 6. **AI CHAT ASSISTANT** (Floating + Drawer)
   - Floating chat button (bottom-right)
   - Opens drawer from right side
   - User types natural language queries:
     - "Show me agents with CC% below 70%"
     - "Who has the highest Fixed Rate in EGLP01?"
     - "What's the average Upgrade Rate across all teams?"
     - "Which agents need improvement in Super Class?"
   - AI responds with:
     - Text answer
     - Filtered agent cards
     - Charts/visualizations
     - Suggestions
   - Uses OpenRouter API
   - Context: user role (only show data user can access)

### 7. **ANALYTICS DASHBOARDS**
   - Overview (already exists, needs refinement)
   - Team Comparison: Compare all teams side-by-side
   - Agent Leaderboard: Top 10, Bottom 10
   - Metric Trends: Track metrics over time
   - Custom Reports: User can select metrics and date ranges

### 8. **USER MANAGEMENT** (Super Admin only)
   - User list page
   - Create new user (email, name, role, assigned teams)
   - Edit user
   - Deactivate user
   - Password reset

## UI/UX REQUIREMENTS

### Design Principles:
- **NO BLUE BACKGROUND** - Use dark theme (charcoal/black) with white cards
- **Professional** - Clean, modern, corporate look
- **Card-based** - Minimize tables, use cards for visual appeal
- **Dynamic** - Clickable, interactive, not static
- **Responsive** - Works on desktop, tablet, mobile

### Color Palette:
- Background: #0A0E27 (very dark blue-grey, almost black)
- Cards: #1A1F3A (dark slate)
- Primary accent: #3B82F6 (blue for CTAs)
- Success: #10B981 (green)
- Warning: #F59E0B (amber)
- Danger: #EF4444 (red)
- Text primary: #F9FAFB (near-white)
- Text secondary: #9CA3AF (grey)

### Typography:
- Font: Inter or Poppins
- Headings: Bold, large
- Body: Regular, readable

## TECHNICAL IMPLEMENTATION PLAN

### Phase 1: Data Model & Upload (CRITICAL)
1. Update Prisma schema to support all Excel data
2. Build Excel parser service for all 5 sources
3. Create upload API endpoints
4. Build upload UI with tabs
5. Test with provided Excel files

### Phase 2: Role-Based Access
1. Add SUPER_ADMIN role to Prisma
2. Update auth middleware
3. Create user management pages
4. Test RBAC flows

### Phase 3: Agent Cards & Detail Pages
1. Redesign Mentors page with cards (team-grouped)
2. Build Agent Detail page with all sections
3. Wire up to real data
4. Add navigation

### Phase 4: Meeting Preparation
1. Design UI with threshold slider
2. Build agent filtering logic
3. Implement AI talking points generation
4. Add export functionality

### Phase 5: AI Chat Assistant
1. Build chat UI component (floating + drawer)
2. Create OpenRouter integration
3. Build natural language query parser
4. Wire up to agent data
5. Test with sample queries

### Phase 6: Polish & Deploy
1. Fix UI/UX issues
2. Performance optimization
3. Mobile responsiveness
4. Final testing
5. Deploy to Railway

## SUCCESS CRITERIA
- ✅ Super Admin can upload all 5 Excel files and see data imported
- ✅ Team Leaders see only their teams
- ✅ Agent cards look professional and show all required metrics
- ✅ Clicking agent card opens detailed page with charts
- ✅ Meeting prep tab generates underperformer list
- ✅ AI chat answers natural language queries accurately
- ✅ UI looks professional (NO blue background, card-based)
- ✅ All features work end-to-end with real data
