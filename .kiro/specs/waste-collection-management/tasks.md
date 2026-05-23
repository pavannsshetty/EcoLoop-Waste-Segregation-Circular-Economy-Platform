# Implementation Plan: Waste Collection Management

## Overview

Implement the Advanced Waste Collection Management feature across the full stack. The work is divided into eight epics: schema & middleware foundations, work completion confirmation, Green Champion analytics & community overview, waste collection map, admin management dashboard, engagement features (performance scoring, citizen ratings, smart notifications, leaderboard, recycling insights, complaint escalation), data integration & real-time sync, and UI/UX wiring. Each epic builds on the previous so that no code is left orphaned.

The implementation language is **JavaScript** (Node.js / CommonJS on the server, React JSX on the client), matching the existing codebase.

---

## Tasks

- [ ] 1. Schema, indexes, and middleware foundations
  - [ ] 1.1 Extend the WasteReport Mongoose schema with completion proof fields
    - Add `completion_image` (String, default `''`), `completion_message` (String, default `''`), `completed_at` (Date, default null), `completed_by` (ObjectId ref Collector, default null), `collected_weight` (Number, default 0), `verification_status` (String enum `['pending','verified','flagged']`, default `'pending'`) to `server/models/WasteReport.js`
    - Add MongoDB indexes on `completed_by`, `verification_status`, and `collected_weight`
    - _Requirements: 1.13, 8.1, 8.2, 8.3_

  - [ ] 1.2 Create `greenChampionProtect` middleware
    - Create `server/middleware/greenChampionAuth.js` that verifies the JWT via the existing `protect` logic and then checks `req.user.role === 'GreenChampion'`, returning HTTP 403 with `"GreenChampion access only."` if not
    - _Requirements: 8.6, 8.7_

  - [ ] 1.3 Create `server/routes/greenChampionRoutes.js` and register it in `server.js`
    - Scaffold the route file with `greenChampionProtect` applied to all routes
    - Mount at `/api/green-champion` in `server/server.js`
    - _Requirements: 8.6_

- [ ] 2. Work completion confirmation — backend
  - [ ] 2.1 Implement `PUT /api/collector/report/:id/complete` endpoint
    - Add the route to `server/routes/collectorRoutes.js` behind `protect` + `collectorAuth` + `upload.single('completion_image')`
    - Validate that the report exists and has `status === 'In Progress'`; return HTTP 400 with a descriptive message otherwise (Req 1.6)
    - Validate that `req.file` is present; return HTTP 400 `"Completion photo is required."` otherwise (Req 1.7)
    - Upload image via `uploadMiddleware` (already applied by `upload.single`); store `req.file.path` in `completion_image` under Cloudinary folder `ecoloop/completions` (Req 8.4)
    - Set `completion_message` (max 500 chars), `collected_weight` (if > 0), `completed_at` (UTC now), `completed_by` (collector ObjectId), `status = 'Resolved'`, `verification_status = 'pending'`
    - Increment `Collector.completedTasks` and trigger `recalculatePerformanceScore` (implemented in task 6.1)
    - Emit `report_completed` Socket.io event via `emitToUser` to the citizen's room with `_id`, `completion_image`, `completion_message`, `completed_at`, `collected_weight` (Req 1.8)
    - Send notification to citizen: `"Your [wasteType] waste report has been resolved. Please rate the collector."` (Req 6C.2)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 2.2 Write unit tests for the completion endpoint
    - Test: missing image → 400; wrong status → 400; valid request → 200 with correct field values; Socket.io event emitted
    - _Requirements: 1.5, 1.6, 1.7, 1.8_

- [ ] 3. Work completion confirmation — admin verification & citizen view
  - [ ] 3.1 Implement `GET /api/admin/completion-proofs` (paginated)
    - Add route to `server/routes/adminRoutes.js` behind `adminProtect`
    - Query WasteReports where `verification_status` is in `['pending','verified','flagged']`
    - Populate `completed_by` with collector `name` and `collectorId`
    - Support `page` and `limit` query params (default page 1, limit 20) (Req 8.5)
    - Return `completion_image`, `completion_message`, `completed_at`, `completed_by`, `collected_weight`, `verification_status`
    - _Requirements: 1.10, 8.5_

  - [ ] 3.2 Implement `PUT /api/admin/report/:id/verify`
    - Add route to `server/routes/adminRoutes.js` behind `adminProtect`
    - Accept `verification_status` in body; validate it is `'verified'` or `'flagged'`; return HTTP 400 otherwise (Req 1.12)
    - Update and return the document
    - _Requirements: 1.11, 1.12_

  - [ ] 3.3 Update `GET /api/waste/my-reports` to include completion proof fields
    - Modify `getMyReports` in `server/controllers/wasteController.js` to include `completion_image`, `completion_message`, `completed_at`, `collected_weight`, `verification_status` in the response
    - _Requirements: 1.9_

  - [ ]* 3.4 Write unit tests for admin verification and citizen view endpoints
    - Test: invalid `verification_status` → 400; valid update → 200; `my-reports` includes completion fields
    - _Requirements: 1.9, 1.11, 1.12_

- [ ] 4. Green Champion analytics dashboard — backend
  - [ ] 4.1 Implement `GET /api/green-champion/dashboard`
    - Add route in `server/routes/greenChampionRoutes.js`
    - Run parallel MongoDB aggregations for: `activeCitizensCount` (distinct userId in current month), `totalWorkersCount` (active collectors), `totalWasteCollected` (sum of `collected_weight` on resolved reports), `segregationRatio`, `recycledWasteCount`, `pendingReports`, `completedReports`, `missedCollections`, `citizenParticipationRate`
    - Include `recyclingInsights` object: `plasticRecycledKg`, `eWasteRecycledKg`, `carbonFootprintSavedKg` (plastic × 2.5 + eWaste × 1.8, rounded to 1 dp)
    - Use aggregation pipelines with indexes for sub-2-second performance (Req 7.2)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6E.1_

  - [ ]* 4.2 Write unit tests for dashboard aggregations
    - Test each metric calculation with known fixture data; verify `carbonFootprintSavedKg` formula; verify 403 for non-GreenChampion
    - _Requirements: 2.1–2.8, 6E.1_

- [ ] 5. Community overview — backend
  - [ ] 5.1 Implement `GET /api/green-champion/community`
    - Add route in `server/routes/greenChampionRoutes.js`
    - Return: `totalRegisteredCitizens`, `totalActiveUsersThisMonth`, `totalReportsSubmitted`, `mostActiveVillage`, `topPerformingCollectors` (top 5 by `completedTasks`), `mostCommonWasteType`, `citizenEngagementGraph` (12-month aggregation), `monthlyWasteCollectionTrend` (12-month aggregation)
    - Use `$group` by `{ year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }` for trend arrays; format month labels as `MMM YYYY`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 5.2 Write unit tests for community endpoint
    - Test `mostActiveVillage` logic, 12-month array length, 403 for non-GreenChampion
    - _Requirements: 3.1–3.8_

- [ ] 6. Waste collection map — backend
  - [ ] 6.1 Implement `GET /api/green-champion/map-data`
    - Add route in `server/routes/greenChampionRoutes.js`; also allow `adminProtect` (dual-protect via middleware array)
    - Return all WasteReports with fields: `_id`, `wasteType`, `status`, `location`, `village`, `image`, `completion_image`, `assignedCollector` (populated name + collectorId), `userId` (populated name), `createdAt`, `completed_at`
    - Support query filters: `wasteType`, `village`, `status`, `dateFrom`, `dateTo`
    - _Requirements: 4.1, 4.2_

- [ ] 7. Admin management dashboard — backend
  - [ ] 7.1 Implement `GET /api/admin/management-stats`
    - Add route to `server/routes/adminRoutes.js` behind `adminProtect`
    - Return `dailyStats`, `weeklyStats`, `monthlyStats` (submitted, resolved, missed counts for today / last 7 / last 30 days)
    - Return `areaPerformance` (per-village breakdown via `$group` on `village`)
    - Return `collectorAttendance` (list of all collectors with `present`/`absent` for today: present if any WasteReport has `completed_at` or `updatedAt` on today's date)
    - Support `page` and `limit` (Req 8.5)
    - _Requirements: 5.1, 5.2_

  - [ ] 7.2 Implement `GET /api/admin/collector-performance`
    - Add route to `server/routes/adminRoutes.js` behind `adminProtect`
    - For each collector return: `Collector_Performance_Score`, `completedTasks`, `averageCompletionTimeHours`, `citizenFeedbackScore`, `attendanceDays`
    - Score formula: `completionRate × 40 + (1 − normalisedAvgTime) × 20 + (feedbackScore / 5) × 20 + attendanceRate × 20`, clamped 0–100
    - Support `page` and `limit` (Req 8.5)
    - _Requirements: 5.3, 5.4, 6A.1–6A.5_

- [ ] 8. Collector performance score — recalculation service
  - [ ] 8.1 Create `server/services/performanceService.js` with `recalculatePerformanceScore(collectorId)`
    - Compute `completionRate`, `avgCompletionTimeHours`, `citizenFeedbackScore`, `attendanceRate` using MongoDB queries
    - Apply weighted formula from Req 6A / 5.4; clamp to 0–100
    - Persist result to `Collector.performanceScore`
    - _Requirements: 6A.1, 6A.2, 6A.3, 6A.4, 6A.5_

  - [ ]* 8.2 Write unit tests for `recalculatePerformanceScore`
    - Test boundary values (0 tasks, all tasks resolved, max attendance); verify clamping
    - _Requirements: 6A.1–6A.5_

- [ ] 9. Citizen rating and feedback — backend
  - [ ] 9.1 Implement `POST /api/waste/rate-collector`
    - Add route to `server/routes/wasteRoutes.js` behind `protect`
    - Validate: report exists, `status === 'Resolved'` (400 if not), report belongs to citizen (403 if not), not already rated (409 if so), `rating` is integer 1–5 (400 if not), `review` max 300 chars
    - Store rating on the WasteReport document (add `rating` Number and `review` String fields to schema, or create a separate embedded sub-document)
    - After saving, call `recalculatePerformanceScore(report.completed_by)`
    - _Requirements: 6B.1, 6B.2, 6B.3, 6B.4, 6B.5, 6B.6_

  - [ ] 9.2 Update `GET /api/waste/my-reports` to include rating status per report
    - Include `rating` and `review` fields so the client can show whether a rating has been submitted (Req 6B.7)
    - _Requirements: 6B.7_

  - [ ]* 9.3 Write unit tests for the rating endpoint
    - Test all error cases (wrong status, wrong user, duplicate, out-of-range rating); verify performance score recalculation is triggered
    - _Requirements: 6B.1–6B.6_

- [ ] 10. Smart notifications — backend
  - [ ] 10.1 Wire smart notification calls into existing event points
    - In `collectorRoutes.js` `PUT /report/:id/status` (Assigned branch): send `"New task assigned: [wasteType] in [village]."` to collector (Req 6C.1) — verify existing notification matches spec wording, update if needed
    - In the new `PUT /api/collector/report/:id/complete` (task 2.1): confirm `"Your [wasteType] waste report has been resolved. Please rate the collector."` is sent to citizen (Req 6C.2)
    - In `reportJobs.js` `escalateOverdueTasks`: update notification message to `"Your [wasteType] waste report pickup was missed. You may escalate the report."` for citizen (Req 6C.3)
    - _Requirements: 6C.1, 6C.2, 6C.3, 6C.5_

  - [ ] 10.2 Implement admin broadcast announcement endpoint
    - Add `POST /api/admin/announce` to `server/routes/adminRoutes.js` behind `adminProtect`
    - Accept `message` in body; use `emitToAll('announcement', { message })` and call `createNotification` for all citizens and collectors
    - _Requirements: 6C.4_

- [ ] 11. Leaderboard — backend update
  - [ ] 11.1 Extend `GET /api/leaderboard` to return GreenChampion and collector rankings
    - Modify `server/routes/leaderboardRoutes.js` to also return `topGreenChampions` (top 10 Users with `role === 'GreenChampion'` by `ecoPoints` desc) and `topCollectors` (top 10 Collectors by `performanceScore` desc) and `mostActiveVillages` (top 10 villages by resolved WasteReport count in current month)
    - Keep existing citizen leaderboard logic intact
    - _Requirements: 6D.1_

- [ ] 12. Complaint escalation — background job update
  - [ ] 12.1 Update `escalateOverdueTasks` in `server/jobs/reportJobs.js`
    - Ensure the query matches Req 6F.1: `deadline < now`, `status not Resolved`, `escalated === false`
    - Set `escalated = true`, `escalatedAt = now`, `severity = 'High'`, `priority += 10` (Req 6F.2)
    - Send collector notification: `"Report [_id] has been auto-escalated due to missed deadline."` (Req 6F.3)
    - Send admin notification via `createNotification` to a designated admin channel: `"Report [_id] in [village] has been auto-escalated."` (Req 6F.4)
    - Ensure job runs at least once per hour (change interval to 60 min if currently 30 min is acceptable; current 30 min satisfies the ≥1/hr requirement) (Req 6F.5)
    - _Requirements: 6F.1, 6F.2, 6F.3, 6F.4, 6F.5_

- [ ] 13. Checkpoint — backend complete
  - Ensure all new API endpoints return correct HTTP status codes and response shapes. Ensure all tests pass. Ask the user if questions arise before proceeding to frontend.

- [ ] 14. Green Champion Dashboard — frontend
  - [ ] 14.1 Create `client/src/citizen/greenChampion/GreenChampionDashboard.jsx`
    - Fetch `GET /api/green-champion/dashboard` on mount; display skeleton loaders (matching shape of metric cards) until response arrives (Req 2.9, 9.5)
    - Render animated statistics cards for each metric using Tailwind CSS transitions consistent with existing card style (Req 9.3)
    - Render a dedicated "Recycling Insights" card section with `plasticRecycledKg`, `eWasteRecycledKg`, `carbonFootprintSavedKg` (Req 6E.2)
    - Subscribe to `report_completed` Socket.io event; on receipt, re-fetch dashboard metrics and show a pulsing dot indicator (Req 2.11, 9.9)
    - Use `useTheme` hook for dark/light mode (Req 9.2)
    - Implement retry logic: on API failure, retry up to 2 times with 1-second delay before showing error state (Req 7.3)
    - _Requirements: 2.9, 2.10, 2.11, 6E.2, 7.3, 7.4, 9.1, 9.2, 9.3, 9.5, 9.9_

  - [ ]* 14.2 Write unit tests for GreenChampionDashboard
    - Test skeleton loader renders before data; metric cards render after data; Socket.io event triggers re-fetch
    - _Requirements: 2.9, 2.10, 2.11_

- [ ] 15. Community Overview — frontend
  - [ ] 15.1 Create `client/src/citizen/greenChampion/CommunityOverview.jsx`
    - Fetch `GET /api/green-champion/community` on mount with skeleton loaders
    - Display `citizenEngagementGraph` as a bar or line chart using `react-leaflet` is not applicable — use a lightweight SVG/canvas chart built with plain Tailwind + inline SVG, or use the existing `recharts`/`chart.js` if present; since only `leaflet` is in package.json, implement a simple SVG bar chart component (Req 3.6, 9.4)
    - Display `monthlyWasteCollectionTrend` as a chart with month labels and kg values (Req 3.7)
    - Display top performers, most active village, most common waste type
    - Use `useTheme` for dark/light mode
    - _Requirements: 3.1–3.8, 9.1, 9.2, 9.4, 9.5_

  - [ ]* 15.2 Write unit tests for CommunityOverview
    - Test chart renders with mock data; skeleton shows before data
    - _Requirements: 3.6, 3.7_

- [ ] 16. Waste Collection Map — frontend
  - [ ] 16.1 Create `client/src/citizen/greenChampion/WasteCollectionMap.jsx`
    - Use `react-leaflet` (`MapContainer`, `TileLayer`, `Marker`, `Popup`) — already in `package.json`
    - Fetch `GET /api/green-champion/map-data` with filter params; display colour-coded markers by status: Pending/Submitted = red, Assigned = blue, In Progress = yellow, Resolved = green, Recycled = teal (Req 4.3)
    - Render popup on marker click with citizen name, waste image, assigned collector name, status, completion proof image if available (Req 4.4)
    - Provide filter controls (waste type, village, status, date range) that re-fetch without full page reload (Req 4.5)
    - Provide "Open Full Screen" button that expands map to fill viewport with a close/exit button (Req 4.6, 9.8)
    - Provide "Refresh Data" button (Req 4.7)
    - Provide "Live Tracking" toggle that subscribes to `report_created` and `report_completed` Socket.io events and updates markers in real time (Req 4.8)
    - Display error message + retry button on API failure (Req 4.9)
    - Use `useTheme` for dark/light mode
    - _Requirements: 4.1–4.9, 9.1, 9.2, 9.8_

  - [ ]* 16.2 Write unit tests for WasteCollectionMap
    - Test markers render with correct colours; filter controls trigger re-fetch; error state shows retry button
    - _Requirements: 4.3, 4.5, 4.9_

- [ ] 17. Admin Management Dashboard — frontend (admin app)
  - [ ] 17.1 Create `admin/src/pages/ManagementDashboard.jsx`
    - Fetch `GET /api/admin/management-stats` on mount with skeleton loaders
    - Display daily/weekly/monthly stats as SVG bar charts (Req 5.5, 9.3)
    - Display collector attendance table (name, collectorId, today's status) (Req 5.6)
    - Display area-wise performance table/chart grouped by village (Req 5.7)
    - Display escalation section: WasteReports with `escalated === true` and status not Resolved, sorted by `escalatedAt` desc (Req 5.9)
    - Display emergency alerts section: WasteReports with `severity === 'High'` and status not Resolved, sorted by `createdAt` desc (Req 5.10)
    - Subscribe to `report_created` and `report_updated` Socket.io events; refresh stats on receipt with pulsing dot indicator (Req 5.8, 9.9)
    - Use `useTheme` for dark/light mode
    - _Requirements: 5.1–5.10, 9.1, 9.2, 9.3, 9.5, 9.9_

  - [ ]* 17.2 Write unit tests for ManagementDashboard
    - Test stats render; Socket.io event triggers refresh; escalation and alert sections render
    - _Requirements: 5.5, 5.8, 5.9, 5.10_

- [ ] 18. Admin Completion Proofs page — frontend (admin app)
  - [ ] 18.1 Create `admin/src/pages/CompletionProofs.jsx`
    - Fetch `GET /api/admin/completion-proofs` with pagination controls
    - Display paginated list with completion image, message, collector name, collected weight, verification status
    - Provide "Verify" and "Flag" action buttons that call `PUT /api/admin/report/:id/verify`
    - Use `useTheme` for dark/light mode
    - _Requirements: 1.10, 1.11, 1.12, 8.5, 9.1, 9.2_

- [ ] 19. Admin Collector Performance page — frontend (admin app)
  - [ ] 19.1 Create `admin/src/pages/CollectorPerformance.jsx`
    - Fetch `GET /api/admin/collector-performance` with pagination
    - Display table with collector name, collectorId, performance score, completed tasks, avg completion time, feedback score, attendance days
    - Use `useTheme` for dark/light mode
    - _Requirements: 5.3, 5.4, 8.5, 9.1, 9.2_

- [ ] 20. Citizen rating UI — frontend (client app)
  - [ ] 20.1 Add rating widget to `client/src/citizen/reports/MyReports.jsx`
    - For each resolved report that has not yet been rated (`!report.rating`), render a 1–5 star rating input and optional review textarea
    - On submit, call `POST /api/waste/rate-collector` with `reportId`, `rating`, `review`
    - Show confirmation and disable the widget after successful submission
    - Display existing rating if already submitted (Req 6B.7)
    - _Requirements: 6B.1, 6B.7, 9.1, 9.2_

- [ ] 21. Leaderboard UI update — frontend (client app)
  - [ ] 21.1 Update `client/src/citizen/leaderboard/Leaderboard.jsx`
    - Add three tabs: "Green Champions", "Collectors", "Villages"
    - Fetch updated `GET /api/leaderboard` response; render each tab with rank number, name, and score/count
    - Display skeleton loaders on mount (Req 6D.3)
    - _Requirements: 6D.1, 6D.2, 6D.3, 9.1, 9.2_

- [ ] 22. Navigation wiring
  - [ ] 22.1 Add GreenChampion nav entries to `client/src/shared/layouts/CitizenLayout.jsx`
    - Add a "Green Champion" section to the sidebar nav, visible only when `user.role === 'GreenChampion'`
    - Entries: "GC Dashboard" → `/citizen/gc-dashboard`, "Community Overview" → `/citizen/community`, "Waste Map" → `/citizen/waste-map`
    - _Requirements: 9.7_

  - [ ] 22.2 Add new admin nav entries to `admin/src/layouts/AdminLayout.jsx`
    - Add entries: "Completion Proofs" → `/admin/completion-proofs`, "Management Dashboard" → `/admin/management`, "Collector Performance" → `/admin/collector-performance`
    - _Requirements: 9.6_

  - [ ] 22.3 Register new routes in client and admin React Router configs
    - In `client/src/App.jsx` (or `CitizenRoutes.jsx`): add routes for `/citizen/gc-dashboard`, `/citizen/community`, `/citizen/waste-map` under the CitizenLayout
    - In `admin/src/App.jsx`: add routes for `/admin/completion-proofs`, `/admin/management`, `/admin/collector-performance` under AdminLayout
    - _Requirements: 9.6, 9.7_

- [ ] 23. Responsive layout and accessibility pass
  - [ ] 23.1 Verify all new components render correctly from 320px to 1920px
    - Check each new page at mobile (320px), tablet (768px), and desktop (1280px) breakpoints using Tailwind responsive classes
    - Ensure all interactive elements have accessible labels (`aria-label`, `title`, or visible text)
    - _Requirements: 8.9, 9.1_

- [ ] 24. Final checkpoint — full integration
  - Ensure all tests pass. Verify Socket.io events flow end-to-end (completion → citizen notification → dashboard refresh). Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The charting requirement (Req 9.4) is satisfied with a lightweight inline SVG bar chart since no dedicated charting library (e.g. recharts, chart.js) is present in `client/package.json`; only `leaflet`/`react-leaflet` is available for maps
- `recalculatePerformanceScore` (task 8.1) is called from both task 2.1 (completion) and task 9.1 (citizen rating) — implement it as a shared service before those callers
- The existing `escalateOverdueTasks` job in `reportJobs.js` already covers most of Req 6F; task 12.1 updates notification wording and confirms the interval
- All new endpoints follow the existing CommonJS `require` pattern; no ES module conversion needed
- Skeleton loaders should match the shape of the content they replace (Req 9.5)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "8.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.2", "3.3", "8.2"] },
    { "id": 3, "tasks": ["3.4", "4.1", "5.1", "6.1", "7.1", "7.2", "9.1", "10.1", "10.2", "11.1", "12.1"] },
    { "id": 4, "tasks": ["4.2", "5.2", "9.2", "9.3"] },
    { "id": 5, "tasks": ["14.1", "15.1", "16.1", "17.1", "18.1", "19.1", "20.1", "21.1"] },
    { "id": 6, "tasks": ["14.2", "15.2", "16.2", "17.2", "22.1", "22.2"] },
    { "id": 7, "tasks": ["22.3"] },
    { "id": 8, "tasks": ["23.1"] }
  ]
}
```
