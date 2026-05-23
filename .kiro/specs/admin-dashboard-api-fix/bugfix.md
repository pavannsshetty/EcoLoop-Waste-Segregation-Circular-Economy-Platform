# Bugfix Requirements Document

## Introduction

The Admin Dashboard in the EcoLoop application fails to reliably fetch and display collector data and waste reports. Collectors already stored in the database do not appear in the dashboard or the ViewCollectors page without a manual server restart. The Reports page silently shows an empty list when the API call fails. The Dashboard page expects an `allReports` field from the `/api/admin/dashboard` endpoint but does not handle the case where it is absent or empty. Additionally, the admin frontend (running on port 5174) is not included in the server's CORS allowed-origins list, which can block API responses in certain environments. These issues combine to produce a broken admin experience where data appears missing, stale, or entirely absent.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the admin navigates to the Dashboard page THEN the system fetches `/api/admin/dashboard` but the CORS policy does not include `http://localhost:5174`, causing the request to be blocked in browser environments where the admin app runs on port 5174.

1.2 WHEN the `/api/admin/dashboard` response is received THEN the system renders the "All Reports Overview" table using `stats.allReports`, but the Dashboard component initialises `stats` without an `allReports` key, so the table always shows "No waste reports have been submitted yet" even when reports exist.

1.3 WHEN the ViewCollectors page mounts THEN the system calls `/api/admin/dashboard` to populate the collectors list, but this endpoint is a heavy aggregation query (fetches all reports and all collectors); if the query is slow or the token is missing, the response silently fails and `collectors` stays empty with no error message shown to the admin.

1.4 WHEN the Reports page fetch to `/api/admin/reports` fails (network error, expired token, or non-OK HTTP status) THEN the system catches the error and does nothing — the `reports` state remains an empty array and the UI shows "No reports found" with no indication that a fetch error occurred.

1.5 WHEN a new collector is added via the Add Collector form THEN the system does not automatically refresh the collectors list on the Dashboard or ViewCollectors pages, so the newly added collector does not appear until the admin manually clicks Refresh or reloads the page.

1.6 WHEN a new waste report is submitted by a citizen THEN the system does not trigger a data refresh on the Admin Dashboard, so the report count and report table remain stale until the admin manually refreshes.

1.7 WHEN the admin token stored in `localStorage` under the key `admin-token` is expired or absent THEN the system sends the request with an invalid or missing `Authorization` header; the backend returns a 401 response, but the frontend silently ignores the non-OK status and leaves the UI empty.

### Expected Behavior (Correct)

2.1 WHEN the admin frontend makes API requests from `http://localhost:5174` THEN the system SHALL include `http://localhost:5174` in the server's CORS allowed-origins list so that browser requests are not blocked.

2.2 WHEN the Dashboard component initialises its state THEN the system SHALL include `allReports: []` in the default `stats` object so that the reports table renders correctly before and after data is fetched.

2.3 WHEN the ViewCollectors page fetches collector data and the request fails or returns a non-OK status THEN the system SHALL set an error state and display a descriptive error message (e.g. "Failed to load collectors. Please try again.") instead of silently showing an empty list.

2.4 WHEN the Reports page fetch fails or returns a non-OK HTTP status THEN the system SHALL set an error state and display a descriptive error message (e.g. "Failed to load reports. Please try again.") instead of silently showing "No reports found."

2.5 WHEN a collector is successfully added, edited, or deleted THEN the system SHALL automatically re-fetch the collectors list so that the updated data is reflected immediately without requiring a manual refresh.

2.6 WHEN the admin dashboard is open and a new waste report is created (via the existing Socket.IO `report_created` event) THEN the system SHALL update the reports list and total report count in real time, or at minimum provide a visible indicator that new data is available.

2.7 WHEN the backend returns a 401 Unauthorized response to any admin API call THEN the system SHALL display an appropriate error message and redirect the admin to the login page so that the session is not silently broken.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the admin provides valid credentials on the login page THEN the system SHALL CONTINUE TO authenticate successfully and store the token under `admin-token` in localStorage.

3.2 WHEN the Dashboard page loads with a valid token and the database contains collectors THEN the system SHALL CONTINUE TO display the correct Total Collectors, Active Collectors, and Total Reports counts in the stat cards.

3.3 WHEN the ViewCollectors page loads successfully THEN the system SHALL CONTINUE TO render the collectors table with all columns (ID, Details, Contact, Working, Report Stats, Status, Actions) and support View, Edit, and Delete actions per row.

3.4 WHEN the Reports page loads successfully THEN the system SHALL CONTINUE TO render the full reports table with all columns and support the View modal for individual report details.

3.5 WHEN the admin edits a collector and a village conflict exists THEN the system SHALL CONTINUE TO show the conflict warning and require explicit confirmation before reassigning villages.

3.6 WHEN the admin deletes a collector THEN the system SHALL CONTINUE TO show a confirmation modal before permanently removing the record.

3.7 WHEN the admin clicks the Refresh button on the Reports or ViewCollectors page THEN the system SHALL CONTINUE TO manually re-fetch the latest data from the backend.

3.8 WHEN the backend `/api/admin/dashboard` endpoint is called with a valid token THEN the system SHALL CONTINUE TO return `totalCollectors`, `activeCollectors`, `totalReports`, `collectors` (with per-collector stats), `recentReports`, and `allReports` in the JSON response.

3.9 WHEN the backend `/api/admin/reports` endpoint is called with a valid token THEN the system SHALL CONTINUE TO return a `reports` array with `userId` and `assignedCollector` fields populated.

---

## Bug Condition Pseudocode

**Bug Condition Function — CORS block on admin origin:**
```pascal
FUNCTION isBugCondition_CORS(request)
  INPUT: request with Origin header
  OUTPUT: boolean
  RETURN request.origin = 'http://localhost:5174'
    AND 'http://localhost:5174' NOT IN server.corsAllowedOrigins
END FUNCTION
```

**Bug Condition Function — Missing allReports in initial state:**
```pascal
FUNCTION isBugCondition_InitialState(component)
  INPUT: Dashboard React component
  OUTPUT: boolean
  RETURN 'allReports' NOT IN component.initialStats
END FUNCTION
```

**Bug Condition Function — Silent fetch failure:**
```pascal
FUNCTION isBugCondition_SilentFailure(fetchResult)
  INPUT: fetchResult with status and body
  OUTPUT: boolean
  RETURN fetchResult.status != 200
    AND component.errorState = null
    AND component.displayedData = []
END FUNCTION
```

**Property: Fix Checking — CORS**
```pascal
FOR ALL request WHERE isBugCondition_CORS(request) DO
  response ← server.handle(request)
  ASSERT response.headers['Access-Control-Allow-Origin'] INCLUDES 'http://localhost:5174'
END FOR
```

**Property: Fix Checking — Silent failure**
```pascal
FOR ALL fetchResult WHERE isBugCondition_SilentFailure(fetchResult) DO
  uiState ← component.render(fetchResult)
  ASSERT uiState.errorMessage != null AND uiState.errorMessage != ''
END FOR
```

**Property: Preservation Checking**
```pascal
FOR ALL request WHERE NOT isBugCondition_CORS(request)
  AND NOT isBugCondition_SilentFailure(request) DO
  ASSERT F(request) = F'(request)
END FOR
```
