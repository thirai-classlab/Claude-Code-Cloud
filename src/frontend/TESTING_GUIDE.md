# Testing Guide - Project & Session Management

## Prerequisites

1. **Backend API must be running**
   ```bash
   cd /Users/t.hirai/AGENTSDK/src/backend
   uvicorn main:app --reload
   ```
   Backend should be accessible at: `http://localhost:8000`

2. **Frontend development server**
   ```bash
   cd /Users/t.hirai/AGENTSDK/src/frontend
   npm install  # if not already done
   npm run dev
   ```
   Frontend should be accessible at: `http://localhost:3000`

## Test Scenarios

### 1. Project Creation

**Steps:**
1. Open `http://localhost:3000`
2. Look at the left sidebar
3. Click "New Project" button
4. Modal should open
5. Enter project name: "Test Project"
6. (Optional) Enter description: "This is a test project"
7. Click "Create Project"

**Expected Results:**
- Modal closes
- New project appears in the sidebar
- Project is automatically selected (highlighted)
- Project is automatically expanded
- Console shows successful API call

**API Call to Verify:**
```bash
curl http://localhost:8000/api/projects
```

### 2. Session Creation

**Steps:**
1. Ensure a project is selected and expanded
2. Click "New Session" button (under the project)
3. Modal should open
4. Enter session title: "Test Session" (or leave blank)
5. Click "Create Session"

**Expected Results:**
- Modal closes
- New session appears under the project
- Session is automatically selected (highlighted)
- Console shows successful API call

**API Call to Verify:**
```bash
curl http://localhost:8000/api/projects/{project_id}/sessions
```

### 3. Project Selection & Expansion

**Steps:**
1. Create 2-3 projects
2. Click on a collapsed project (▶ icon)
3. Project should expand (▼ icon)
4. Sessions should load automatically

**Expected Results:**
- Project expands/collapses on click
- Sessions load when expanded
- Previously expanded project collapses
- Selected project is highlighted

### 4. Session Selection

**Steps:**
1. Expand a project with sessions
2. Click on a session

**Expected Results:**
- Session is highlighted
- Session ID is stored in sessionStore
- Can be verified in browser DevTools: Application > Local Storage

### 5. Delete Project

**Steps:**
1. Right-click on a project
2. Context menu appears
3. Click "Delete Project"
4. Confirmation dialog appears
5. Click "OK"

**Expected Results:**
- Project is removed from the list
- All sessions under it are deleted (cascade)
- API call to DELETE /api/projects/{id}

### 6. Delete Session

**Steps:**
1. Right-click on a session
2. Context menu appears
3. Click "Delete Session"
4. Confirmation dialog appears
5. Click "OK"

**Expected Results:**
- Session is removed from the list
- API call to DELETE /api/sessions/{id}

### 7. Data Persistence

**Steps:**
1. Create a project and session
2. Refresh the page (F5)

**Expected Results:**
- Projects reload from API
- Current project ID persists (localStorage)
- Sessions reload when project expanded

### 8. Error Handling

**Test 8.1: Backend Down**
1. Stop the backend server
2. Try to create a project

**Expected Results:**
- Loading state shows
- Error message displays: "Network error. Please check your connection."
- No crash, graceful degradation

**Test 8.2: Invalid Input**
1. Open "New Project" modal
2. Leave name blank
3. Click "Create Project"

**Expected Results:**
- Validation error: "Project name is required"
- Modal stays open
- No API call made

### 9. UI/UX Features

**Test 9.1: Modal Controls**
- Escape key closes modal
- Click outside modal closes it
- Close button (X) works
- Body scroll is locked when modal is open

**Test 9.2: Loading States**
- Button shows spinner during API calls
- Button is disabled during loading
- "Creating..." or similar feedback

**Test 9.3: Context Menu**
- Right-click opens context menu
- Click outside closes context menu
- Context menu positioned correctly

**Test 9.4: Responsive Design**
- Sidebar works on different screen sizes
- Scroll works when many projects/sessions
- Touch-friendly on mobile

## Browser DevTools Inspection

### Check Network Requests

1. Open DevTools (F12)
2. Go to Network tab
3. Create a project
4. Verify requests:
   - `POST http://localhost:8000/api/projects` - 201 Created
   - Response body contains new project with `id`

### Check State Management

1. Open DevTools (F12)
2. Go to Application tab
3. Look at Local Storage
4. Find keys:
   - `project-storage` - Current project ID
   - `session-storage` - Current session ID

### Check Console for Errors

1. Open Console tab
2. No red errors should appear
3. API calls should log successfully

## API Testing with curl

### List Projects
```bash
curl http://localhost:8000/api/projects
```

### Create Project
```bash
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"API Test Project","description":"Created via curl"}'
```

### Get Project
```bash
curl http://localhost:8000/api/projects/{project_id}
```

### Create Session
```bash
curl -X POST http://localhost:8000/api/projects/{project_id}/sessions \
  -H "Content-Type: application/json" \
  -d '{"title":"API Test Session"}'
```

### List Sessions
```bash
curl http://localhost:8000/api/projects/{project_id}/sessions
```

### Delete Session
```bash
curl -X DELETE http://localhost:8000/api/sessions/{session_id}
```

### Delete Project
```bash
curl -X DELETE http://localhost:8000/api/projects/{project_id}
```

## Common Issues

### Issue: "Failed to load projects"
**Solution:** Ensure backend is running on port 8000

### Issue: Modal doesn't open
**Solution:** Check browser console for JavaScript errors

### Issue: Projects don't persist
**Solution:** Check backend database and API responses

### Issue: CORS errors
**Solution:** Ensure backend CORS is configured for `http://localhost:3000`

## Success Criteria

- [ ] Can create projects
- [ ] Can create sessions in projects
- [ ] Can expand/collapse projects
- [ ] Can select projects and sessions
- [ ] Can delete projects and sessions
- [ ] Data persists across page reloads
- [ ] Error messages are user-friendly
- [ ] No console errors
- [ ] UI is responsive
- [ ] Loading states work
- [ ] Modals work correctly

## Next Steps After Testing

1. Test chat functionality with a session
2. Test WebSocket connection
3. Test file operations
4. Test code editor integration
5. Full end-to-end workflow

---

**Last Updated:** 2025-12-21
**Status:** Ready for Testing
