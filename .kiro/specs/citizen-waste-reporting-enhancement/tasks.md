# Tasks: Citizen Waste Reporting Enhancement

## Overview

Implementation tasks derived from the design and requirements documents. Tasks are ordered by dependency — infrastructure and data model changes first, then backend logic, then frontend components.

---

## Task List

- [ ] 1. Install Leaflet dependencies and fix Vite icon assets
  - [x] 1.1 Install `leaflet@1.9.4` and `react-leaflet@4.2.1` in `client/`
  - [x] 1.2 Create `client/src/shared/utils/leafletIconFix.js` that patches `L.Icon.Default` to use Vite-imported marker icon assets
  - [ ] 1.3 Verify Leaflet CSS is importable from `leaflet/dist/leaflet.css`

- [ ] 2. Update WasteReport schema and backend controller
  - [ ] 2.1 Add `formattedAddress: { type: String, default: '' }` field to `server/models/WasteReport.js`
  - [ ] 2.2 Add village match validation in `createReport` in `server/controllers/wasteController.js`: compare `req.user.village` (normalized) against `req.body.village`; return HTTP 403 with message `"You can report waste only within your registered village (<Village Name>)."` on mismatch
  - [ ] 2.3 Add `formattedAddress` to the fields read from `req.body` and stored in the `WasteReport.create()` call in `createReport`
  - [ ] 2.4 Update the required-fields validation guard in `createReport` to no longer require `houseNo`, `street`, `wardNumber` as hard-required (they are now auto-filled and may be empty on first pass — keep them stored but not blocking)

- [ ] 3. Rewrite `MapPicker.jsx` with interactive Leaflet map
  - [ ] 3.1 Replace the static OSM iframe with a `react-leaflet` `MapContainer` + `TileLayer` (OSM tiles), centered on Kundapura Taluk (13.3409, 74.7421), zoom 8
  - [ ] 3.2 Accept `registeredVillage` prop and use it for village match validation
  - [ ] 3.3 Implement `reverseGeocode(lat, lng)` using Nominatim — extract `village` from `address.village || address.hamlet || address.suburb || address.neighbourhood`; extract `taluk`, `city`, `district`, `state`, `country`, `pincode`, `formattedAddress`
  - [ ] 3.4 Implement `validateVillageMatch(detected, registered)` pure function — case-insensitive trimmed comparison; return `true` if `registered` is empty
  - [ ] 3.5 Implement map click handler using `useMapEvents` — on click, reverse geocode the point and set `pendingLocation` state; show `LocationConfirmDialog`
  - [ ] 3.6 Implement `LocationConfirmDialog` inline component — shows lat (6dp), lng (6dp), address; "Use this location" and "Cancel" buttons
  - [ ] 3.7 On confirm: promote pending marker to confirmed (green), call `onLocationSelect` with full location data including `villageValid` and `regionValid`; on cancel: remove pending marker, clear `pendingLocation`
  - [ ] 3.8 Update "Detect My Location" to use `{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }` and show confirm dialog on success (not directly call `onLocationSelect`)
  - [ ] 3.9 Update address search (Nominatim) to show confirm dialog when a suggestion is selected (not directly call `onLocationSelect`)
  - [ ] 3.10 Display village validation banner below map: green success when `villageValid === true`, red error with `"You can report waste only within your registered village (<Village Name>)."` when `villageValid === false`
  - [ ] 3.11 Display selected coordinates (lat/lng to 6dp) in an info box below the map after confirmation

- [ ] 4. Update `ReportWasteModal.jsx`
  - [ ] 4.1 Remove `LOC_METHODS` array, `locMethod` state, and the method toggle button group from the JSX
  - [ ] 4.2 Add `ServiceAreaBanner` inline component that displays `"Service Area: <user.village>, Kundapura Taluk"` above the map; if `user.village` is empty, display `"Service Area: Kundapura Taluk"`
  - [ ] 4.3 Pass `registeredVillage={user?.village || ''}` prop to `MapPicker`
  - [ ] 4.4 In `handleLocationSelect`, read `loc.villageValid` and set a `villageError` boolean state; also read `loc.regionValid`
  - [ ] 4.5 Auto-fill address fields from confirmed location: set `street` from `loc.area || loc.city` if `form.street` is currently empty; leave `houseNo`, `landmark`, `wardNumber` empty (user fills these)
  - [ ] 4.6 Keep address fields (`houseNo`, `street`, `landmark`, `wardNumber`) disabled/read-only until a location has been confirmed (i.e., `location !== null`); enable them after first location confirmation
  - [ ] 4.7 Update the submit button: disable when `villageError === true`; change label to `"Outside Service Area"` when disabled due to village mismatch
  - [ ] 4.8 Update `validate()` to remove the `locMethod === 'manual'` branch; always require a map location (`!location` → error)
  - [ ] 4.9 Update `doSubmit()` FormData to include `formattedAddress` from `location.formattedAddress`; remove the `locMethod === 'manual'` fallback location construction
  - [ ] 4.10 If `user?.village` is not yet loaded when the modal opens (loading state), show a loading indicator and block the form body until the village is available

- [ ] 5. Update `isInKundapura` region check to also extract and return `taluk` field
  - [ ] 5.1 In `MapPicker.jsx`, update `reverseGeocode` to include `taluk: a.county || a.state_district || ''` in the returned object so the `isInKundapura` check can use it

- [ ] 6. Verify and test
  - [ ] 6.1 Write unit tests for `validateVillageMatch` — test: exact match, case-insensitive match, mismatch, empty registered (should return true), empty detected (should return false)
  - [ ] 6.2 Write unit tests for `reverseGeocode` — mock `fetch`, verify village extraction from various Nominatim response shapes (village, hamlet, suburb, neighbourhood)
  - [ ] 6.3 Write unit test for backend village validation in `createReport` — mock `req.user.village` and `req.body.village`, verify 403 on mismatch and 201 on match
  - [ ] 6.4 Manually verify end-to-end: open modal → service area banner shows → click map → confirm dialog appears → confirm → green/red banner shows → submit succeeds/fails correctly
  - [ ] 6.5 Manually verify GPS detection: click "Detect My Location" → button shows "Detecting..." → confirm dialog appears → confirm → location committed
  - [ ] 6.6 Manually verify address auto-fill: after confirming a location, `street` field is populated; manually editing the field works; fields are disabled before any location is selected
