# Bugfix Requirements Document

## Introduction

The EcoLoop application (a Solid Waste Management & Circular Economy platform) suffers from a broad set of data-flow, API integration, database synchronisation, real-time update, authentication, and error-handling defects that collectively prevent the system from functioning correctly in production. The bugs span three separate frontends (citizen client, collector client, admin panel) and the shared Node/Express/MongoDB backend. The fix must restore correct end-to-end data flow, eliminate stale-data and manual-refresh requirements, enforce proper authentication and role-based access, and make the system stable and production-ready — without breaking any currently working behaviour.

---

## Bug Analysis

### Current Behavior (Defect)

**1. Backend & API Integration**

1.1 WHEN a frontend component (admin dashboard, citizen dashboard, collector dashboard) makes an API request THEN the system returns incorrect data, an HTTP error, or no response due to broken route definitions, wrong endpoint paths, or mismatched request/response formats.

1.2 WHEN an API call is made without proper `async/await` and `try/catch` wrapping THEN the system crashes or silently fails, leaving the UI in a broken or permanently loading state.

1.3 WHEN an API call succeeds or fails THEN the system does not display loading indicators, success confirmations, empty-state messages, or meaningful error messages to the user.

1.4 WHEN a component mounts or a user action triggers data fetching THEN the system fires duplicate API calls or causes unnecessary re-renders, degrading performance and producing inconsistent UI state.

**2. Database Synchronisation**

2.1 WHEN a user inserts, updates, or deletes a record (report, collector, scrap request, etc.) THEN the system does not reflect the change in the UI without a full manual page refresh.

2.2 WHEN the admin adds a new collector via the Add Collector form THEN the collector does not appear in the admin dashboard collector table even though the record exists in the database.

2.3 WHEN a collector's status, village assignment, or profile is updated THEN the admin dashboard, collector dashboard, and citizen-facing views continue to display stale data.

2.4 WHEN a waste report status changes (Submitted → Assigned → In Progress → Resolved) THEN the citizen dashboard, collector assigned-reports view, and admin reports page do not update until manually refreshed.

**3. Real-Time Fetching**

3.1 WHEN a new waste report is submitted by a citizen THEN the system does not push a real-time update to the assigned collector's dashboard or the admin panel via Socket.io.

3.2 WHEN a collector accepts, progresses, or resolves a task THEN the citizen's report status and the admin reports table do not update in real time.

3.3 WHEN a notification is created (report assigned, status changed, escalation, etc.) THEN the notification bell count and notification list do not update in real time without a manual refresh.

3.4 WHEN dashboard statistics (total reports, active collectors, completed today, etc.) change THEN the stat cards and charts do not reflect the new values until the page is reloaded.

**4. Authentication & User Data**

4.1 WHEN a citizen, collector, or admin logs in THEN the system does not correctly fetch and hydrate the logged-in user's full profile from the database, causing name, role, village, ecoPoints, and other fields to be missing or stale.

4.2 WHEN a JWT token expires or is invalid THEN the system does not redirect the user to the login page; instead it shows broken UI or silent failures.

4.3 WHEN a protected route is accessed without a valid token THEN the system does not enforce the guard and may expose data to unauthenticated requests.

4.4 WHEN a collector attempts to access citizen-only routes (or vice versa) THEN the system does not enforce role-based access control and may return data belonging to a different role.

**5. Dashboard Issues**

5.1 WHEN the admin navigates to the Dashboard page THEN the collectors table shows zero rows even though collector records exist in the database, because `getDashboardStats` or the frontend rendering logic fails silently.

5.2 WHEN the admin navigates to the Reports page THEN reports are not fetched or displayed correctly due to missing population of `userId` or `assignedCollector` references.

5.3 WHEN the collector opens their dashboard THEN stat cards (New Reports, Assigned, In Progress, Completed Today, Total Tasks) show `—` or `0` because the `/api/collector/stats` call fails or returns incomplete data.

5.4 WHEN the citizen opens their dashboard THEN `reportsCount`, `resolvedCount`, `ecoPoints`, and `streakCount` show incorrect or default values because the profile fetch or report fetch fails.

5.5 WHEN pagination, filtering, searching, or sorting controls are used on any dashboard table THEN the system does not apply the operation correctly, returning unfiltered or unsorted data.

**6. Database Validation**

6.1 WHEN the backend receives a request with null, undefined, or missing required fields THEN the system crashes with an unhandled exception instead of returning a structured validation error.

6.2 WHEN a database query references a field name that does not match the Mongoose schema (e.g. `phone` vs `mobile`, `village` vs `villages`) THEN the query returns empty results or incorrect data without any error indication.

6.3 WHEN a document references a foreign key (e.g. `assignedCollector`, `userId`) that no longer exists THEN the system crashes or returns `null` reference errors instead of handling the missing reference gracefully.

**7. Location & Village Data**

7.1 WHEN a citizen registers with a village and later submits a waste report THEN the system does not correctly use the registered village from the user profile, causing village-based collector assignment to fail.

7.2 WHEN a collector's assigned villages are updated by the admin THEN the collector's dashboard village-task feed does not reflect the new assignment until the collector logs out and back in.

7.3 WHEN a user selects a location on the Google Map picker THEN the system does not accurately extract and store latitude, longitude, address, and village fields, causing location-based features to malfunction.

**8. Performance**

8.1 WHEN a dashboard page loads THEN the system issues redundant or unbatched database queries (e.g. fetching all reports and all collectors separately when a single aggregated query would suffice), causing slow API response times.

8.2 WHEN large datasets are fetched (e.g. all reports, all collectors) THEN the system returns the full unfiltered dataset to the frontend, causing frontend lag and excessive memory usage.

**9. Error Handling & Debugging**

9.1 WHEN a network request fails (timeout, server down, CORS error) THEN the system does not display a meaningful error message to the user and does not log the failure for debugging.

9.2 WHEN a JavaScript runtime error occurs (undefined/null access, missing property) THEN the system crashes the component or page without a fallback UI or error boundary.

9.3 WHEN a backend controller encounters an error THEN the system does not log sufficient context (route, user ID, error stack) to enable efficient debugging.

---

### Expected Behavior (Correct)

**1. Backend & API Integration**

2.1 WHEN a frontend component makes an API request THEN the system SHALL call the correct endpoint with the correct HTTP method, headers, and body format, and the backend SHALL return a well-structured JSON response with the appropriate HTTP status code.

2.2 WHEN an API call is made THEN the system SHALL wrap all async operations in `async/await` with `try/catch` blocks so that errors are caught and handled without crashing the application.

2.3 WHEN an API call is initiated, succeeds, or fails THEN the system SHALL display a loading spinner during the request, a success message or updated UI on completion, an empty-state message when no data is returned, and a descriptive error message on failure.

2.4 WHEN a component mounts or a user action triggers data fetching THEN the system SHALL deduplicate API calls using appropriate React patterns (dependency arrays, refs, or abort controllers) to prevent duplicate requests and unnecessary re-renders.

**2. Database Synchronisation**

2.5 WHEN a user inserts, updates, or deletes a record THEN the system SHALL immediately reflect the change in the relevant UI views without requiring a manual page refresh, either by re-fetching the affected data or by updating local state optimistically.

2.6 WHEN the admin adds a new collector THEN the system SHALL re-fetch the collector list and display the new collector in the admin dashboard table immediately after the successful API response.

2.7 WHEN a collector's profile or assignment is updated THEN the system SHALL invalidate and re-fetch the affected data in all relevant views (admin dashboard, collector dashboard).

2.8 WHEN a waste report status changes THEN the system SHALL update the citizen dashboard, collector assigned-reports view, and admin reports page to reflect the new status.

**3. Real-Time Fetching**

2.9 WHEN a new waste report is submitted THEN the system SHALL emit a `report_created` Socket.io event to all connected clients so that the assigned collector's dashboard and the admin panel update in real time.

2.10 WHEN a collector updates a task status THEN the system SHALL emit a `report_updated` Socket.io event so that the citizen's report status and the admin reports table update in real time.

2.11 WHEN a notification is created THEN the system SHALL emit a Socket.io event to the target user's room so that the notification bell count and list update in real time.

2.12 WHEN dashboard statistics change THEN the system SHALL update stat cards and charts in real time via Socket.io events or periodic polling, without requiring a full page reload.

**4. Authentication & User Data**

2.13 WHEN a citizen, collector, or admin logs in THEN the system SHALL fetch the full user profile from the database and store it in both context state and localStorage, ensuring all fields (name, role, village, ecoPoints, collectorId, etc.) are correctly populated.

2.14 WHEN a JWT token expires or is invalid THEN the system SHALL detect the 401 response, clear the stored token and user data, and redirect the user to the appropriate login page.

2.15 WHEN a protected route is accessed without a valid token THEN the system SHALL reject the request with a 401 response and the frontend route guard SHALL redirect to the login page.

2.16 WHEN a user accesses a route that does not match their role THEN the system SHALL deny access and redirect to the appropriate dashboard for their role.

**5. Dashboard Issues**

2.17 WHEN the admin navigates to the Dashboard page THEN the system SHALL fetch and display all collectors with their stats (totalAssigned, completed, active) and all reports with populated citizen and collector references.

2.18 WHEN the admin navigates to the Reports page THEN the system SHALL fetch all reports with fully populated `userId` (name, phone, email) and `assignedCollector` (name, collectorId, phone) fields.

2.19 WHEN the collector opens their dashboard THEN the system SHALL fetch and display accurate stat counts for New Reports, Assigned, In Progress, Completed Today, and Total Tasks.

2.20 WHEN the citizen opens their dashboard THEN the system SHALL display accurate `reportsCount`, `resolvedCount`, `ecoPoints`, and `streakCount` values sourced from the database.

2.21 WHEN pagination, filtering, searching, or sorting controls are used THEN the system SHALL apply the operation correctly and return only the matching, ordered subset of data.

**6. Database Validation**

2.22 WHEN the backend receives a request with null, undefined, or missing required fields THEN the system SHALL return a structured 400 error response listing the missing fields, without crashing.

2.23 WHEN a database query uses a field name THEN the system SHALL use field names that exactly match the Mongoose schema definition, and any mismatch SHALL be corrected so queries return accurate results.

2.24 WHEN a document references a foreign key that no longer exists THEN the system SHALL handle the null reference gracefully, returning a safe default value or a descriptive error rather than crashing.

**7. Location & Village Data**

2.25 WHEN a citizen submits a waste report THEN the system SHALL use the village stored in the authenticated user's profile for collector assignment, and SHALL validate that the reported location is within the registered village.

2.26 WHEN a collector's assigned villages are updated THEN the system SHALL immediately reflect the new village assignment in the collector's dashboard village-task feed on next data fetch.

2.27 WHEN a user selects a location on the Google Map picker THEN the system SHALL accurately extract and store latitude, longitude, address, and village fields in the report document.

**8. Performance**

2.28 WHEN a dashboard page loads THEN the system SHALL batch related database queries using `Promise.all` and return aggregated data in a single API response to minimise round-trips and response time.

2.29 WHEN large datasets are requested THEN the system SHALL apply server-side pagination, filtering, and field projection so that only the required subset of data is transferred to the frontend.

**9. Error Handling & Debugging**

2.30 WHEN a network request fails THEN the system SHALL display a user-facing error message describing the failure and SHALL log the error with sufficient context (endpoint, user ID, error message) to the server console.

2.31 WHEN a JavaScript runtime error occurs THEN the system SHALL catch it via error boundaries or null-safe access patterns and display a fallback UI rather than crashing the page.

2.32 WHEN a backend controller encounters an error THEN the system SHALL log the route, user ID, and full error stack to the server console to enable efficient debugging.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a citizen submits a valid waste report with all required fields THEN the system SHALL CONTINUE TO create the report, attempt automatic collector assignment, award 5 EcoPoints, send notifications, and emit the `report_created` socket event.

3.2 WHEN a collector accepts a task (status → Assigned) THEN the system SHALL CONTINUE TO lock the report to that collector using the atomic `findOneAndUpdate` with `isLocked` guard to prevent race conditions.

3.3 WHEN a collector marks a task as Resolved THEN the system SHALL CONTINUE TO increment `completedTasks`, set `citizenVerified` to `pending`, and notify the citizen to verify the resolution.

3.4 WHEN a citizen verifies a resolved report as "no" THEN the system SHALL CONTINUE TO reopen the report, clear the assigned collector, and re-queue it for assignment.

3.5 WHEN the admin adds a collector with a duplicate mobile number, name, team leader, vehicle number, or email THEN the system SHALL CONTINUE TO reject the request with the appropriate 409 conflict error.

3.6 WHEN the admin assigns a village already assigned to an active collector THEN the system SHALL CONTINUE TO return a conflict response listing the affected villages and collector details, and SHALL CONTINUE TO support force-reassign via the `forceReassign` flag.

3.7 WHEN a citizen reaches the daily report limit (5 reports per day) THEN the system SHALL CONTINUE TO reject additional submissions with a 429 rate-limit error.

3.8 WHEN a citizen upvotes a report THEN the system SHALL CONTINUE TO toggle the upvote, recalculate severity based on upvote count thresholds (≥10 → High, ≥4 → Medium, else Low), and award 2 EcoPoints.

3.9 WHEN a citizen escalates a report THEN the system SHALL CONTINUE TO set `escalated: true`, raise severity to High, increment priority by 10, and notify the assigned collector.

3.10 WHEN the admin deletes a collector THEN the system SHALL CONTINUE TO permanently remove the collector document from the database.

3.11 WHEN a user logs in with valid credentials THEN the system SHALL CONTINUE TO issue a signed JWT token with the correct role and user ID payload.

3.12 WHEN the collector profile endpoint is called THEN the system SHALL CONTINUE TO return the collector's name, email, phone (mapped from `mobile`), role, locality (mapped from `area`), profilePhoto, completedTasks, collectorId, city, area, performanceScore, and availability.

3.13 WHEN the `findBestCollector` algorithm runs THEN the system SHALL CONTINUE TO prefer village-matched collectors, then city-matched collectors, then any eligible collector, selecting the one with the fewest active tasks and respecting the `MAX_ACTIVE_TASKS` (10) cap.

3.14 WHEN Socket.io is initialised THEN the system SHALL CONTINUE TO support user room joining via the `join` event and SHALL CONTINUE TO emit targeted notifications via `emitToUser`.

3.15 WHEN the admin dashboard API is called THEN the system SHALL CONTINUE TO return `totalCollectors`, `activeCollectors`, `totalReports`, `collectors` (with per-collector stats), `recentReports`, and `allReports` in a single response.

---

## Bug Condition Pseudocode

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type SystemInteraction
         (an API call, a UI action, a data mutation, or a page load)
  OUTPUT: boolean

  RETURN (
    // API / route issues
    X.apiEndpoint IS incorrect OR X.requestFormat IS invalid OR
    X.asyncHandling IS missing OR X.errorHandling IS absent OR

    // Data sync issues
    X.dataSource IS stale AND X.triggerType IN [insert, update, delete] OR

    // Real-time issues
    X.socketEvent IS NOT emitted WHEN X.dataChanged = true OR

    // Auth issues
    X.token IS expired OR X.token IS absent AND X.routeIsProtected = true OR
    X.userRole DOES NOT MATCH X.requiredRole OR

    // Dashboard / fetch issues
    X.populatedField IS null AND X.fieldIsRequired = true OR
    X.queryFieldName DOES NOT MATCH X.schemaFieldName OR

    // Null / crash issues
    X.value IS null OR X.value IS undefined AND X.nullCheckAbsent = true
  )
END FUNCTION
```

### Fix Checking Property

```pascal
// Property: Fix Checking — All Bug Conditions Resolved
FOR ALL X WHERE isBugCondition(X) DO
  result ← F'(X)   // F' = fixed system
  ASSERT result.httpStatus IN [200, 201, 400, 401, 403, 404, 409, 429]
    AND result.uiState IN [loaded, error_shown, empty_state_shown]
    AND result.dataIsStale = false
    AND result.socketEventEmitted = (X.dataChanged = true)
    AND result.userRedirected = (X.token IS expired OR X.token IS absent)
    AND result.crashOccurred = false
END FOR
```

### Preservation Checking Property

```pascal
// Property: Preservation Checking — No Regression on Working Paths
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
  // i.e. report creation, collector assignment, task locking,
  //      resolution flow, upvoting, escalation, admin CRUD,
  //      JWT issuance, and notification delivery all behave identically
  //      before and after the fix
END FOR
```
