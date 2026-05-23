# Requirements Document

## Introduction

This feature adds Advanced Waste Collection Management and Work Completion capabilities to the EcoLoop Green Champion platform. It spans nine functional areas: work completion confirmation with photo proof, a Green Champion analytics dashboard, a community overview section, an interactive waste collection map, an admin management dashboard, additional engagement features (performance scoring, citizen ratings, smart notifications, leaderboard, recycling insights, complaint escalation), data integration and real-time synchronization, database and system requirements, and UI/UX standards.

The platform is built on React + Vite + Tailwind CSS (frontend), Node.js + Express + MongoDB/Mongoose (backend), Cloudinary for image storage, JWT authentication, and Socket.io for real-time events.

---

## Glossary

- **System**: The EcoLoop platform as a whole (backend API + frontend clients).
- **Collector**: A registered waste collector who accepts and completes waste collection tasks.
- **Citizen**: A registered user who submits waste reports and rates collectors.
- **GreenChampion**: A privileged citizen role with access to analytics dashboards and community data.
- **Admin**: A platform administrator with full management access.
- **WasteReport**: A MongoDB document in the `WasteReport` collection representing a single waste collection request.
- **Completion_Proof**: The set of fields added to a WasteReport upon collection: `completion_image`, `completion_message`, `completed_at`, `completed_by`, `collected_weight`, and `verification_status`.
- **Verification_Status**: An enum field on WasteReport with values `pending`, `verified`, or `flagged`.
- **Collector_Performance_Score**: A numeric score (0–100) auto-calculated from completion rate, average time taken, citizen feedback score, and attendance.
- **Citizen_Rating**: A 1–5 star rating with optional review text submitted by a Citizen after a WasteReport is resolved.
- **Leaderboard**: A ranked list of top Green Champions, top Collectors, and most active villages.
- **Segregation_Ratio**: The proportion of waste reports categorised as segregated (Dry Waste or Wet Waste) versus mixed, expressed as a percentage.
- **Recycled_Waste_Count**: The count of WasteReports with `wasteType` of `Plastic Waste` or `E-Waste` that have status `Resolved`.
- **Missed_Collection**: A WasteReport that has passed its `deadline` without reaching `Resolved` status.
- **Citizen_Participation_Rate**: The percentage of registered Citizens who have submitted at least one WasteReport in the current calendar month.
- **Socket.io**: The real-time event library used for push notifications and live dashboard updates.
- **Cloudinary**: The cloud image storage service used for all uploaded photos.
- **uploadMiddleware**: The existing Multer + Cloudinary middleware at `server/middleware/uploadMiddleware.js`.
- **adminProtect**: The existing admin JWT middleware at `server/middleware/adminAuth.js`.
- **protect**: The existing citizen/collector JWT middleware at `server/middleware/auth.js`.

---

## Requirements

---

### Requirement 1: Work Completion Confirmation

**User Story:** As a Collector, I want to mark a waste report as completed by uploading a photo and entering optional details, so that citizens and admins have verifiable proof of collection.

#### Acceptance Criteria

1. WHEN a Collector submits a completion request to `PUT /api/collector/report/:id/complete` with a multipart form containing a `completion_image` file, THEN THE System SHALL upload the image to Cloudinary using uploadMiddleware and store the returned URL in `WasteReport.completion_image`.
2. WHEN a Collector submits a completion request, THE System SHALL record `WasteReport.completed_at` as the current UTC timestamp and `WasteReport.completed_by` as the authenticated Collector's ObjectId.
3. WHEN a Collector submits a completion request with a `collected_weight` value greater than 0, THE System SHALL store the value in kilograms in `WasteReport.collected_weight`.
4. WHEN a Collector submits a completion request with an optional `completion_message`, THE System SHALL store the text (maximum 500 characters) in `WasteReport.completion_message`.
5. WHEN a Collector submits a valid completion request, THE System SHALL set `WasteReport.status` to `Resolved` and `WasteReport.verification_status` to `pending`.
6. IF a Collector submits a completion request for a WasteReport that is not in `In Progress` status, THEN THE System SHALL return HTTP 400 with a descriptive error message and SHALL NOT modify the WasteReport.
7. IF a Collector submits a completion request without a `completion_image` file, THEN THE System SHALL return HTTP 400 with the message "Completion photo is required." and SHALL NOT modify the WasteReport.
8. WHEN a WasteReport status changes to `Resolved`, THE System SHALL emit a `report_completed` Socket.io event containing the WasteReport `_id`, `completion_image` URL, `completion_message`, `completed_at`, and `collected_weight` to the Citizen's user room.
9. WHEN a Citizen views their report history after completion, THE System SHALL include `completion_image`, `completion_message`, `completed_at`, `collected_weight`, and `verification_status` in the `GET /api/waste/my-reports` response for each resolved report.
10. WHEN an Admin calls `GET /api/admin/completion-proofs`, THE System SHALL return a paginated list of all WasteReports with `verification_status` of `pending`, `verified`, or `flagged`, including `completion_image` URL, `completion_message`, `completed_at`, `completed_by` (populated with collector name and collectorId), and `collected_weight`.
11. WHEN an Admin calls `PUT /api/admin/report/:id/verify` with `verification_status` set to `verified` or `flagged`, THE System SHALL update `WasteReport.verification_status` to the provided value and return the updated document.
12. IF an Admin calls `PUT /api/admin/report/:id/verify` with a `verification_status` value other than `verified` or `flagged`, THEN THE System SHALL return HTTP 400 with a descriptive error message.
13. THE System SHALL add the following fields to the WasteReport schema: `completion_image` (String, default `''`), `completion_message` (String, default `''`), `completed_at` (Date, default null), `completed_by` (ObjectId ref Collector, default null), `collected_weight` (Number, default 0), `verification_status` (String enum `['pending', 'verified', 'flagged']`, default `'pending'`).

---

### Requirement 2: Green Champion Analytics Dashboard

**User Story:** As a GreenChampion, I want to view a real-time analytics dashboard with key waste management metrics, so that I can monitor community performance and identify areas for improvement.

#### Acceptance Criteria

1. WHEN a GreenChampion calls `GET /api/green-champion/dashboard`, THE System SHALL return a JSON object containing: `activeCitizensCount`, `totalWorkersCount`, `totalWasteCollected` (sum of `collected_weight` across all resolved reports), `segregationRatio`, `recycledWasteCount`, `pendingReports`, `completedReports`, `missedCollections`, and `citizenParticipationRate`.
2. THE System SHALL calculate `activeCitizensCount` as the count of distinct `userId` values in WasteReports created within the current calendar month.
3. THE System SHALL calculate `totalWorkersCount` as the count of individual Collector documents with `status` equal to `Active`, regardless of `collectorType`.
4. THE System SHALL calculate `segregationRatio` as the percentage of WasteReports with `wasteType` in `['Dry Waste', 'Wet Waste']` out of all WasteReports, rounded to one decimal place.
5. THE System SHALL calculate `recycledWasteCount` as the count of WasteReports with `wasteType` in `['Plastic Waste', 'E-Waste']` and `status` equal to `Resolved`.
6. THE System SHALL calculate `missedCollections` as the count of WasteReports where `deadline` is less than the current UTC time and `status` is not `Resolved`.
7. THE System SHALL calculate `citizenParticipationRate` as the percentage of registered Citizens (User documents with `role` equal to `Citizen`) who have at least one WasteReport created in the current calendar month, rounded to one decimal place.
8. IF a non-GreenChampion authenticated user calls `GET /api/green-champion/dashboard`, THEN THE System SHALL return HTTP 403 with the message "GreenChampion access only."
9. WHEN the GreenChampionDashboard component mounts, THE System SHALL display skeleton loaders for each metric card until the API response is received.
10. WHEN the GreenChampionDashboard component receives the API response, THE System SHALL display each metric in an animated statistics card matching the existing EcoLoop eco-friendly UI style and supporting dark/light mode via the `useTheme` hook.
11. WHEN a `report_completed` Socket.io event is received on the client, THE System SHALL refresh the dashboard metrics without requiring a full page reload.

---

### Requirement 3: Community Overview Section

**User Story:** As a GreenChampion, I want to view a community overview with citizen engagement trends and top performers, so that I can understand participation patterns and recognise outstanding contributors.

#### Acceptance Criteria

1. WHEN a GreenChampion calls `GET /api/green-champion/community`, THE System SHALL return: `totalRegisteredCitizens`, `totalActiveUsersThisMonth`, `totalReportsSubmitted`, `mostActiveVillage`, `topPerformingCollectors` (top 5 by `completedTasks`), `mostCommonWasteType`, `citizenEngagementGraph` (monthly report counts for the last 12 months), and `monthlyWasteCollectionTrend` (monthly sum of `collected_weight` for the last 12 months).
2. THE System SHALL calculate `mostActiveVillage` as the village name with the highest count of WasteReports in the current calendar month.
3. THE System SHALL calculate `mostCommonWasteType` as the `wasteType` value with the highest count across all WasteReports.
4. THE System SHALL calculate `citizenEngagementGraph` using a MongoDB aggregation pipeline that groups WasteReports by year and month, returning an array of 12 objects each with `month` (formatted as `MMM YYYY`) and `count`.
5. THE System SHALL calculate `monthlyWasteCollectionTrend` using a MongoDB aggregation pipeline that groups resolved WasteReports by year and month, summing `collected_weight`, returning an array of 12 objects each with `month` and `totalWeight`.
6. WHEN the Community Overview section renders, THE System SHALL display `citizenEngagementGraph` data as a line or bar chart using a charting library already present in the client package.json.
7. WHEN the Community Overview section renders, THE System SHALL display `monthlyWasteCollectionTrend` data as a chart with month labels and weight values in kilograms.
8. IF a non-GreenChampion authenticated user calls `GET /api/green-champion/community`, THEN THE System SHALL return HTTP 403 with the message "GreenChampion access only."

---

### Requirement 4: Waste Collection Map

**User Story:** As a GreenChampion or Admin, I want to view an interactive full-screen map showing all waste reports as colour-coded markers, so that I can monitor collection status across all areas at a glance.

#### Acceptance Criteria

1. WHEN a GreenChampion or Admin calls `GET /api/green-champion/map-data`, THE System SHALL return all WasteReports with fields: `_id`, `wasteType`, `status`, `location` (lat, lng, address), `village`, `image`, `completion_image`, `assignedCollector` (populated with name and collectorId), `userId` (populated with name), `createdAt`, and `completed_at`.
2. THE System SHALL support query parameters `wasteType`, `village`, `status`, `dateFrom`, and `dateTo` on `GET /api/green-champion/map-data` to filter the returned reports.
3. WHEN the Waste Collection Map component renders, THE System SHALL display each WasteReport as a map marker colour-coded by status: Pending/Submitted as red, Assigned as blue, In Progress as yellow, Resolved as green, and Recycled (wasteType Plastic Waste or E-Waste with status Resolved) as teal.
4. WHEN a user clicks a map marker, THE System SHALL display a popup containing: citizen name, waste image, assigned collector name, current status, and completion proof image (if available).
5. THE Waste_Collection_Map SHALL provide filter controls for waste type, village/area, status, and date range that update the displayed markers without a full page reload.
6. THE Waste_Collection_Map SHALL provide an "Open Full Screen" button that expands the map to fill the viewport.
7. THE Waste_Collection_Map SHALL provide a "Refresh Data" button that re-fetches map data from the API.
8. THE Waste_Collection_Map SHALL provide a "Live Tracking" toggle that, when enabled, subscribes to `report_created` and `report_completed` Socket.io events and updates markers in real time.
9. IF the map data API call fails, THEN THE Waste_Collection_Map SHALL display an error message and a retry button.

---

### Requirement 5: Admin Management Dashboard

**User Story:** As an Admin, I want a management dashboard with real-time monitoring, collector performance tracking, attendance, and area-wise analytics, so that I can oversee operations and respond to issues promptly.

#### Acceptance Criteria

1. WHEN an Admin calls `GET /api/admin/management-stats`, THE System SHALL return: `dailyStats` (reports submitted, resolved, and missed today), `weeklyStats` (same metrics for the last 7 days), `monthlyStats` (same metrics for the last 30 days), `areaPerformance` (per-village breakdown of submitted, resolved, and missed counts), and `collectorAttendance` (list of collectors with `present` or `absent` status for today based on whether they updated any report today).
2. THE System SHALL determine a Collector's attendance for a given day as `present` if the Collector has at least one WasteReport with `completed_at` or `updatedAt` on that day, and `absent` otherwise.
3. WHEN an Admin calls `GET /api/admin/collector-performance`, THE System SHALL return a list of all Collectors with their `Collector_Performance_Score`, `completedTasks`, `averageCompletionTimeHours`, `citizenFeedbackScore` (average Citizen_Rating received), and `attendanceDays` (count of days present in the current month).
4. THE System SHALL calculate `Collector_Performance_Score` as a weighted sum: completion rate × 40 + (1 − normalised average completion time) × 20 + citizen feedback score normalised to 0–20 + attendance rate × 20, clamped to the range 0–100.
5. WHEN an Admin views the Management Dashboard, THE System SHALL display daily, weekly, and monthly statistics in chart form.
6. WHEN an Admin views the Management Dashboard, THE System SHALL display collector attendance as a table with one row per Collector showing name, collectorId, and today's attendance status.
7. WHEN an Admin views the Management Dashboard, THE System SHALL display area-wise performance as a table or chart grouped by village.
8. WHEN a new WasteReport is created or a WasteReport status changes, THE System SHALL emit a Socket.io event that the Admin Management Dashboard listens to and uses to refresh its statistics without a full page reload.
9. THE Admin_Management_Dashboard SHALL display an issue escalation section listing all WasteReports with `escalated` equal to `true` that are not yet `Resolved`, sorted by `escalatedAt` descending.
10. THE Admin_Management_Dashboard SHALL display an emergency waste alerts section listing all WasteReports with `severity` equal to `High` and `status` not equal to `Resolved`, sorted by `createdAt` descending.

---

### Requirement 6A: Collector Performance Score

**User Story:** As an Admin or GreenChampion, I want each collector's performance score to be automatically calculated from objective metrics, so that I can fairly evaluate and compare collector effectiveness.

#### Acceptance Criteria

1. WHEN a WasteReport is marked `Resolved` by a Collector, THE System SHALL recalculate that Collector's `Collector_Performance_Score` and persist the updated value to `Collector.performanceScore`.
2. THE System SHALL calculate completion rate as the count of WasteReports with `status` equal to `Resolved` and `completed_by` equal to the Collector's ObjectId, divided by the total count of WasteReports ever assigned to that Collector, expressed as a value between 0 and 1.
3. THE System SHALL calculate average completion time as the mean of (`completed_at` − `lockedAt`) in hours across all resolved WasteReports for the Collector.
4. THE System SHALL calculate citizen feedback score as the mean of all Citizen_Rating values submitted for the Collector, normalised to a 0–1 scale (rating / 5).
5. THE System SHALL calculate attendance rate as the count of days the Collector was `present` in the current calendar month divided by the total working days elapsed in the current calendar month.

---

### Requirement 6B: Citizen Rating and Feedback

**User Story:** As a Citizen, I want to rate and review the collector after my waste report is resolved, so that I can provide feedback that improves service quality.

#### Acceptance Criteria

1. WHEN a Citizen calls `POST /api/waste/rate-collector` with `reportId`, `rating` (integer 1–5), and optional `review` (string, maximum 300 characters), THE System SHALL create a rating record linked to the WasteReport and the Collector identified by `WasteReport.completed_by`.
2. IF a Citizen calls `POST /api/waste/rate-collector` for a WasteReport that does not have `status` equal to `Resolved`, THEN THE System SHALL return HTTP 400 with the message "Report must be resolved before rating."
3. IF a Citizen calls `POST /api/waste/rate-collector` for a WasteReport they did not submit, THEN THE System SHALL return HTTP 403 with the message "Not authorised to rate this report."
4. IF a Citizen calls `POST /api/waste/rate-collector` for a WasteReport they have already rated, THEN THE System SHALL return HTTP 409 with the message "You have already rated this collection."
5. IF a Citizen submits a `rating` value outside the range 1–5, THEN THE System SHALL return HTTP 400 with the message "Rating must be between 1 and 5."
6. WHEN a Citizen rating is saved, THE System SHALL trigger recalculation of the Collector's `Collector_Performance_Score` as defined in Requirement 6A.
7. WHEN a Citizen views a resolved report in their report history, THE System SHALL indicate whether a rating has already been submitted for that report.

---

### Requirement 6C: Smart Notifications

**User Story:** As a Citizen or Collector, I want to receive targeted smart notifications for key events, so that I stay informed without being overwhelmed by irrelevant alerts.

#### Acceptance Criteria

1. WHEN a Collector is assigned a new WasteReport, THE System SHALL send a notification to that Collector with the message "New task assigned: [wasteType] in [village]."
2. WHEN a WasteReport status changes to `Resolved`, THE System SHALL send a notification to the report's Citizen with the message "Your [wasteType] waste report has been resolved. Please rate the collector."
3. WHEN a WasteReport passes its `deadline` without reaching `Resolved` status, THE System SHALL send a missed pickup reminder notification to the report's Citizen with the message "Your [wasteType] waste report pickup was missed. You may escalate the report."
4. WHEN an Admin creates a platform-wide announcement, THE System SHALL broadcast the announcement text as a notification to all registered Citizens and Collectors via Socket.io.
5. THE System SHALL deliver all notifications through the existing `createNotification` function in `server/controllers/notificationController.js` and SHALL NOT create a separate notification storage mechanism.

---

### Requirement 6D: Leaderboard

**User Story:** As a Citizen or GreenChampion, I want to view a leaderboard of top Green Champions, top Collectors, and most active villages, so that I can see community rankings and feel motivated to contribute.

#### Acceptance Criteria

1. WHEN a user calls `GET /api/leaderboard` (or the existing leaderboard endpoint), THE System SHALL return `topGreenChampions` (top 10 Users with `role` equal to `GreenChampion` ranked by `ecoPoints` descending), `topCollectors` (top 10 Collectors ranked by `performanceScore` descending), and `mostActiveVillages` (top 10 villages ranked by resolved WasteReport count in the current month descending).
2. THE Leaderboard_Component SHALL display three tabs: "Green Champions", "Collectors", and "Villages", each showing the respective ranked list with rank number, name, and score/count.
3. WHEN the Leaderboard_Component mounts, THE System SHALL display skeleton loaders until the API response is received.

---

### Requirement 6E: Recycling Insights

**User Story:** As a GreenChampion, I want to view recycling insights including plastic recycled, e-waste recycled, and estimated carbon footprint saved, so that I can communicate the environmental impact of the community's efforts.

#### Acceptance Criteria

1. WHEN a GreenChampion calls `GET /api/green-champion/dashboard`, THE System SHALL include a `recyclingInsights` object in the response containing: `plasticRecycledKg` (sum of `collected_weight` for resolved Plastic Waste reports), `eWasteRecycledKg` (sum of `collected_weight` for resolved E-Waste reports), and `carbonFootprintSavedKg` (calculated as `plasticRecycledKg × 2.5 + eWasteRecycledKg × 1.8`, rounded to one decimal place).
2. THE GreenChampionDashboard SHALL display `recyclingInsights` in a dedicated "Recycling Insights" card section with labelled values for plastic recycled, e-waste recycled, and carbon footprint saved.

---

### Requirement 6F: Complaint Escalation

**User Story:** As the System, I want to automatically escalate unresolved waste reports that have passed their deadline, so that overdue collections are flagged for admin attention without requiring manual intervention.

#### Acceptance Criteria

1. WHEN a scheduled job runs (at least once per hour), THE System SHALL query all WasteReports where `deadline` is less than the current UTC time, `status` is not `Resolved`, and `escalated` is `false`.
2. FOR EACH such WasteReport found, THE System SHALL set `escalated` to `true`, `escalatedAt` to the current UTC timestamp, `severity` to `High`, and increment `priority` by 10.
3. WHEN a WasteReport is auto-escalated, THE System SHALL send a notification to the assigned Collector (if any) with the message "Report [_id] has been auto-escalated due to missed deadline."
4. WHEN a WasteReport is auto-escalated, THE System SHALL send a notification to the Admin (via a designated admin notification channel) with the message "Report [_id] in [village] has been auto-escalated."
5. THE System SHALL use the existing `reportJobs` scheduler in `server/jobs/reportJobs.js` to run the auto-escalation job, extending it rather than creating a new scheduler.

---

### Requirement 7: Data Integration and Synchronisation

**User Story:** As a platform user, I want all dashboards and data views to reflect real-time changes and load efficiently, so that I always see accurate information without performance degradation.

#### Acceptance Criteria

1. WHEN any WasteReport is created, updated, or resolved, THE System SHALL emit the appropriate Socket.io event (`report_created`, `report_updated`, or `report_completed`) to all connected clients using the existing `emitToAll` and `emitToUser` functions in `server/socket.js`.
2. THE System SHALL use MongoDB aggregation pipelines with appropriate indexes for all dashboard statistics queries to ensure each query completes within 2 seconds under normal load.
3. WHEN an API call fails on the client, THE System SHALL retry the request up to 2 additional times with a 1-second delay between attempts before displaying an error state.
4. WHEN data is loading on any dashboard or list view, THE System SHALL display skeleton loaders matching the shape of the expected content.
5. THE System SHALL enforce role-based data access: Citizens may only access their own reports and public leaderboard data; Collectors may only access reports assigned to them or in their village queue; GreenChampions may access aggregated community data; Admins may access all data.

---

### Requirement 8: Database and System Requirements

**User Story:** As a platform operator, I want the database to be properly indexed, images stored securely, and all endpoints protected by role-based access control, so that the system is performant, secure, and scalable.

#### Acceptance Criteria

1. THE System SHALL add a MongoDB index on `WasteReport.completed_by` to support efficient completion proof queries.
2. THE System SHALL add a MongoDB index on `WasteReport.verification_status` to support efficient admin verification queries.
3. THE System SHALL add a MongoDB index on `WasteReport.collected_weight` to support efficient aggregation queries.
4. THE System SHALL store all completion images in Cloudinary under the `ecoloop/completions` folder using the existing uploadMiddleware configuration.
5. ALL paginated list endpoints (completion proofs, collector performance, management stats) SHALL support `page` and `limit` query parameters, defaulting to page 1 and limit 20.
6. ALL new API endpoints SHALL be protected by the appropriate middleware: `protect` for citizen/collector endpoints, `adminProtect` for admin endpoints, and a new `greenChampionProtect` middleware for GreenChampion-only endpoints.
7. THE `greenChampionProtect` middleware SHALL verify the JWT token and confirm the user's `role` is `GreenChampion`, returning HTTP 403 if not.
8. THE System SHALL validate all incoming request bodies on new endpoints and return HTTP 400 with descriptive field-level error messages for any missing or invalid required fields.
9. WHERE a mobile responsive UI is required, THE System SHALL ensure all new frontend components render correctly on viewport widths from 320px to 1920px.

---

### Requirement 9: UI/UX Requirements

**User Story:** As a platform user, I want all new screens to match the existing EcoLoop eco-friendly design system and support dark/light mode, so that the experience feels cohesive and polished.

#### Acceptance Criteria

1. THE System SHALL implement all new frontend components using the existing Tailwind CSS utility classes and colour palette (green-500/600 primary, slate neutrals) consistent with existing pages such as `CollectorDashboard.jsx` and `AdminLayout.jsx`.
2. THE System SHALL support dark and light mode on all new components by consuming the `useTheme` hook from `client/src/shared/context/ThemeContext.jsx` and applying the `dk(dark, light)` pattern used throughout the codebase.
3. THE System SHALL display animated statistics cards on the GreenChampion dashboard and Admin Management Dashboard using CSS transitions consistent with the existing card animation style.
4. THE System SHALL display charts and graphs using a charting library already present in the client `package.json`, without introducing new charting dependencies.
5. THE System SHALL display skeleton loaders on all new data-loading views, matching the shape of the content they replace.
6. THE System SHALL add new navigation entries to `admin/src/layouts/AdminLayout.jsx` for "Completion Proofs", "Management Dashboard", and "Collector Performance" pages.
7. THE System SHALL add new navigation entries to `client/src/shared/layouts/CitizenLayout.jsx` for the GreenChampion role, including "GC Dashboard", "Community Overview", and "Waste Map" pages, visible only when `user.role === 'GreenChampion'`.
8. THE Waste_Collection_Map SHALL support a full-screen mode that covers the entire viewport and provides a close/exit button to return to the normal layout.
9. WHEN a real-time Socket.io event updates dashboard data, THE System SHALL display a subtle animated indicator (e.g. a pulsing dot) to signal that data has been refreshed.
