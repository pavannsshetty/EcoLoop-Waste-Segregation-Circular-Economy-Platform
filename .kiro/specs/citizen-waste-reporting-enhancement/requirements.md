# Requirements: Citizen Waste Reporting Enhancement

## Introduction

This document defines the functional and non-functional requirements for enhancing the Citizen Waste Reporting module in the EcoLoop application. The enhancement enforces service-area restrictions based on the citizen's registered village, replaces the static OpenStreetMap iframe with an interactive Leaflet map, improves GPS accuracy, adds village-level location validation on both frontend and backend, and auto-fills address fields after location selection.

## Requirements

### Requirement 1

**User Story:** As a citizen, I want the Report Waste form to automatically show my registered village as the service area so that I know where I am allowed to submit reports.

1. The system MUST automatically fetch the logged-in citizen's `village` field from their user profile when the Report Waste modal is opened. If the fetch fails due to network issues or missing profile data, the system MUST block form access and display an error until village data is successfully retrieved.
2. The system MUST display a service area banner in the Location section with the text: "Service Area: \<Village Name\>, Kundapura Taluk".
3. The village field in the service area banner MUST be read-only and non-editable by the citizen.
4. The system MUST remove the manual location entry toggle (the "Enter Manually" mode button) from the Report Waste form so that only map-based location selection is available.

### Requirement 2

**User Story:** As a citizen, I want the system to validate that my selected location is within my registered village so that I cannot accidentally submit reports outside my service area.

1. When a location is selected via any method (Detect My Location, Search Address, or Pick on Map), the system MUST perform reverse geocoding via Nominatim to determine the village of the selected coordinates.
2. The system MUST compare the reverse-geocoded village against the citizen's registered village using a case-insensitive, trimmed string comparison.
3. If the detected village does not match the registered village, the system MUST display a red error message: "You can report waste only within your registered village (\<Village Name\>)." below the map.
4. If the detected village matches the registered village, the system MUST display a green success message: "Location is within your registered village." below the map.
5. The system MUST disable the form submission button and change its label to "Outside Service Area" when the selected location is outside the citizen's registered village.
6. The backend `createReport` endpoint MUST validate that the `village` in the submitted report matches the authenticated user's registered `village`, returning HTTP 403 with an appropriate message if they do not match.
7. If the citizen's registered village is empty (not set during registration), the village restriction MUST be skipped and form submission MUST be automatically enabled when the selected location is within Kundapura Taluk, with other enabling conditions (valid location, required fields) still applying.

### Requirement 3

**User Story:** As a citizen, I want the GPS location detection to be as accurate as possible so that my reported location is precise.

1. The system MUST use `enableHighAccuracy: true`, `timeout: 15000`, and `maximumAge: 0` as geolocation options when detecting the citizen's current location.
2. If GPS detection times out, the system MUST display the error message: "Location detection timed out. Try again."
3. If GPS permission is denied, the system MUST display the error message: "Location permission denied. Please allow access in browser settings."

### Requirement 4

**User Story:** As a citizen, I want to interactively pick a location on the map by clicking any point so that I can precisely mark where the waste is located.

1. The system MUST replace the static OpenStreetMap iframe with an interactive Leaflet map using `react-leaflet`.
2. When the citizen clicks any point on the map, the system MUST place or move a marker to the clicked coordinates.
3. After any location selection (click, detect, or search), the system MUST display a confirmation dialog showing the latitude, longitude, and formatted address before committing the location to the form.
4. If the citizen confirms the dialog, the system MUST save the coordinates and address to the form state and call `onLocationSelect` with the confirmed location data.
5. If the citizen cancels the dialog, the system MUST NOT update the selected location, MUST remove the pending marker, and MUST leave the previously confirmed location unchanged.

### Requirement 5

**User Story:** As a citizen, I want the address fields to be automatically filled in after I select a location on the map so that I don't have to type everything manually.

1. After a location is confirmed, the system MUST auto-fill the `street` field with the area or city from the reverse geocoding result if the field is currently empty.
2. The system MUST preserve any existing user input in address fields and MUST NOT overwrite fields the citizen has already typed.
3. The citizen MUST be able to manually edit all address fields (House No / Building Name, Street / Area / Locality, Landmark, Ward Number) after auto-fill occurs. Address fields MUST NOT be editable before any location has been selected and auto-fill has been triggered.

### Requirement 6

**User Story:** As a system administrator, I want all relevant location data to be stored with each waste report so that reports can be accurately processed and assigned.

1. The system MUST store the following fields in each `WasteReport` document: `location.lat`, `location.lng`, `formattedAddress`, `village`, `houseNo`, `street`, `landmark`, and `wardNumber`.
2. The `WasteReport` Mongoose schema MUST be updated to include a `formattedAddress` field of type `String` with a default value of `''`.

### Requirement 7

**User Story:** As a citizen, I want a clear and intuitive location selection experience so that I can easily report waste without confusion.

1. The system MUST display the selected coordinates (latitude and longitude, formatted to 6 decimal places) below the map after a location is confirmed.
2. The system MUST retain the three location input method buttons: "Detect My Location", "Search Address", and "Pick Location on Map".
3. The system MUST NOT show a mode toggle that switches between map and manual entry modes.
4. The address search input MUST use Nominatim for autocomplete suggestions with a debounce of 350ms, restricted to India.
5. The "Detect My Location" button MUST show a "Detecting..." label and be disabled while GPS detection is in progress. When GPS detection is not running, the button MUST show its normal label and be enabled.
