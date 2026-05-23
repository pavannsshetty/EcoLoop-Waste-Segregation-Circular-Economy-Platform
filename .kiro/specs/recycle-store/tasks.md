# Implementation Plan: Recycle Store

## Overview

Implement the Recycle Store feature end-to-end: Mongoose models, Express controller and routes, admin management UI, citizen browsing/request UI, real-time Socket.io integration, and admin analytics. All code follows existing EcoLoop patterns (scrapController, wasteRoutes, AdminLayout NAV, CitizenLayout NAV_CIRCULAR).

## Tasks

- [ ] 1. Create Mongoose models for RecycleItem and RecycleRequest
  - Create `server/models/RecycleItem.js` following the `ScrapRequest.js` schema pattern
  - Define all fields: `itemName`, `category` (enum CATEGORIES), `description`, `price` (min 0), `stock` (min 0), `image`, `status` (enum available/unavailable), `isFeatured`, `viewCount`, with `timestamps: true`
  - Define the `CATEGORIES` constant array with all 10 fixed values and export it
  - Add MongoDB indexes on `category`, `status`, `isFeatured`, `createdAt`
  - Create `server/models/RecycleRequest.js` with fields: `userId` (ref User), `itemId` (ref RecycleItem), `quantity` (min 1), `status` (enum Pending/Approved/Rejected/Completed), `message`, with `timestamps: true`
  - Add MongoDB indexes on `userId`, `itemId`, `status`, `createdAt`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2_

- [ ] 2. Implement the recycleStoreController
  - [ ] 2.1 Implement `addItem` — validate required fields, upload image via `req.file.path`, create RecycleItem, emit `recycle-store:new-item` via `socket.emitToAll`, return 201
    - Import `socket` from `../socket` and call `socket.emitToAll('recycle-store:new-item', item)` after save
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.2 Write property test for `addItem` — socket emit on creation
    - **Property 7: Socket broadcast on item creation**
    - **Validates: Requirements 3.3**
    - Mock `socket.emitToAll`, call `addItem` with valid data, assert mock called exactly once with the created item

  - [ ] 2.3 Implement `getItems` — build query from `category`, `search`, `featured` params, always filter `status: 'available'`, paginate with default limit 20 (max 100), sort by `createdAt` desc, return `{ items, total, page, limit }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 2.4 Write property test for `getItems` — available-only and filter correctness
    - **Property 1: Available-only browsing**
    - **Property 2: Filter correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
    - Seed DB with mixed available/unavailable items across categories; assert all returned items are available and match filters

  - [ ] 2.5 Implement `updateItem` — find by id (404 if missing), apply field updates, handle new image upload, return 200 with updated item
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 2.6 Implement `deleteItem` — find by id (404 if missing), delete document, return 200
    - _Requirements: 5.1, 5.2_

  - [ ] 2.7 Implement `createRequest` — validate itemId and quantity, find item (404 if missing), check status and stock (400 if unavailable or insufficient), create RecycleRequest, decrement stock with `$inc`, auto-set status to `unavailable` if stock reaches 0, return 201
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 2.8 Write property tests for `createRequest` — stock invariants
    - **Property 3: Request creation and stock decrement invariant**
    - **Property 4: Stock exhaustion triggers unavailability**
    - **Property 5: Request rejection when stock insufficient or item unavailable**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
    - Generate random (stock, quantity) pairs; verify stock decrements correctly, unavailability triggers at 0, and rejections leave stock unchanged

  - [ ] 2.9 Implement `getMyRequests` — find all RecycleRequests for `req.user.id`, populate `itemId`, sort by `createdAt` desc, return array
    - _Requirements: 9.1_

  - [ ]* 2.10 Write property test for `getMyRequests` — citizen request isolation
    - **Property 8: Citizen request data isolation**
    - **Validates: Requirements 9.1**
    - Create requests for multiple users; assert each user only receives their own requests

  - [ ] 2.11 Implement `getAllRequests` — find all RecycleRequests, populate `userId` and `itemId`, sort by `createdAt` desc, return array (admin only)
    - _Requirements: 10.1_

  - [ ] 2.12 Implement `getAnalytics` — use `countDocuments` for totalItems, outOfStock (stock:0), totalRequests; use aggregation pipeline for mostViewedCategory (group by category, sum viewCount, sort desc, limit 1); return analytics object
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 2.13 Write property test for `getAnalytics` — counts consistency
    - **Property 6: Analytics counts consistency**
    - **Validates: Requirements 11.2, 11.3, 11.4**
    - Seed DB with random items and requests; assert totalItems, outOfStock, totalRequests match direct countDocuments calls and outOfStock ≤ totalItems

- [ ] 3. Checkpoint — backend logic complete
  - Ensure all controller functions are implemented and exported correctly
  - Verify models export correctly and indexes are defined
  - Ask the user if questions arise before proceeding to routes

- [ ] 4. Create recycleStoreRoutes and register in server.js
  - Create `server/routes/recycleStoreRoutes.js` following the `wasteRoutes.js` pattern
  - Wire routes with correct middleware:
    - `POST /items` → `adminProtect`, `upload.single('image')`, `addItem`
    - `GET /items` → `getItems` (no auth — public browse)
    - `PUT /items/:id` → `adminProtect`, `upload.single('image')`, `updateItem`
    - `DELETE /items/:id` → `adminProtect`, `deleteItem`
    - `POST /request` → `protect`, `createRequest`
    - `GET /requests/my` → `protect`, `getMyRequests`
    - `GET /requests` → `adminProtect`, `getAllRequests`
    - `GET /analytics` → `adminProtect`, `getAnalytics`
  - Add `app.use('/api/recycle-store', require('./routes/recycleStoreRoutes'))` to `server/server.js`
  - _Requirements: 3.6, 4.4, 5.3, 7.0, 8.7, 10.2, 11.6, 14.1_

  - [ ]* 4.1 Write example tests for auth middleware enforcement
    - Test that POST /items without admin token returns 401
    - Test that POST /request without citizen token returns 401
    - Test that GET /analytics without admin token returns 401
    - _Requirements: 3.6, 8.7, 11.6_

- [ ] 5. Checkpoint — backend complete
  - Ensure all routes are registered and server starts without errors
  - Manually verify GET /api/recycle-store/items returns empty array (no auth needed)
  - Ask the user if questions arise

- [ ] 6. Build admin Recycle Store management page
  - [ ] 6.1 Create `admin/src/pages/RecycleStoreManage.jsx`
    - Fetch all items from `GET /api/recycle-store/items` (use admin token, fetch all without status filter by adding an admin-specific query or fetching without filter — note: admin needs to see all items including unavailable, so add `?adminView=true` param handled in controller, OR fetch from a separate admin endpoint; use `GET /api/recycle-store/items?all=true` with adminProtect)
    - Display items in a responsive table: image thumbnail, itemName, category badge, price, stock, status toggle, isFeatured toggle, Edit button, Delete button
    - Add category filter tabs at the top using the CATEGORIES constant
    - "Add Item" button opens `ItemFormModal` in create mode
    - Edit button opens `ItemFormModal` pre-populated with item data
    - Delete button shows a confirmation prompt (inline or modal) before calling DELETE endpoint
    - Use `localStorage.getItem('admin-token')` for all API calls
    - Match existing admin page styling (dark mode support via `useTheme`, green accent colors)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.8_

  - [ ] 6.2 Create `ItemFormModal` component within `RecycleStoreManage.jsx`
    - Controlled form with fields: itemName (text), category (select from CATEGORIES), description (textarea), price (number), stock (number), status (select available/unavailable), isFeatured (checkbox)
    - Image input with preview using `URL.createObjectURL`
    - Client-side validation: itemName required, category required, price ≥ 0, stock ≥ 0
    - On submit: build `FormData`, POST or PUT to correct endpoint, close modal on success, update parent item list
    - _Requirements: 12.3, 12.4_

  - [ ] 6.3 Create `admin/src/pages/RecycleAnalytics.jsx`
    - Fetch from `GET /api/recycle-store/analytics` with admin token
    - Display 4 stat cards: Total Items, Out of Stock, Total Requests, Most Viewed Category
    - Match existing admin Dashboard stat card styling
    - _Requirements: 12.7_

  - [ ] 6.4 Register admin routes and add to NAV in `AdminLayout.jsx` and `App.jsx`
    - Add to `NAV` array in `AdminLayout.jsx`: `{ path: '/admin/recycle-store', icon: HiShoppingBag, label: 'Recycle Store' }` and `{ path: '/admin/recycle-analytics', icon: HiChartBar, label: 'Recycle Analytics' }`
    - Add `<Route path="recycle-store" element={<RecycleStoreManage />} />` and `<Route path="recycle-analytics" element={<RecycleAnalytics />} />` to `admin/src/App.jsx`
    - Import the new page components in `App.jsx`
    - _Requirements: 12.1, 12.7_

- [ ] 7. Build citizen Recycle Store page
  - [ ] 7.1 Create `client/src/citizen/recycleStore/RecycleStorePage.jsx`
    - Fetch items from `GET /api/recycle-store/items` on mount
    - Render featured items section (horizontal scroll or highlighted grid) at top when featured items exist
    - Render recently added section (latest 4 items by createdAt)
    - Render main item grid: responsive (1 col mobile / 2 col tablet / 3-4 col desktop)
    - Each card shows: image, "Recycled Product" tag, itemName, category badge, price, stock count, availability status, "Add to Cart" button (disabled if unavailable/stock 0)
    - Search input with 300ms debounce calling `fetchItems` with search param
    - Category filter pills (All + 10 CATEGORIES) updating the active filter and re-fetching
    - Register Socket.io listener for `recycle-store:new-item` on mount; prepend new item to list; remove listener on unmount
    - Use `localStorage.getItem('token')` for authenticated requests
    - Match existing citizen UI styling (green theme, Tailwind, rounded cards, dark mode support via `useTheme`)
    - _Requirements: 6.6, 6.7, 6.8, 6.9, 6.10, 7.1, 7.2, 8.8, 13.1, 13.2, 13.3, 13.4_

  - [ ] 7.2 Create `ItemDetailModal` component within `RecycleStorePage.jsx`
    - Display full item details: large image, itemName, category, description, price, stock count, status badge
    - Quantity selector (number input, min 1, max = item.stock)
    - Optional message textarea
    - "Request Item" button: calls `POST /api/recycle-store/request` with `{ itemId, quantity, message }`
    - Show success toast on 201; show error toast with server message on 4xx
    - Disable button and show "Out of Stock" if stock is 0 or status is unavailable
    - _Requirements: 8.1, 8.4, 8.5, 8.8_

  - [ ] 7.3 Create `client/src/citizen/recycleStore/MyRecycleRequests.jsx`
    - Fetch from `GET /api/recycle-store/requests/my` with citizen token
    - Display requests in a list/card layout with: item image, item name, quantity, request date, status badge (color-coded: Pending=yellow, Approved=blue, Rejected=red, Completed=green)
    - Empty state message when no requests exist
    - _Requirements: 9.1, 9.2_

  - [ ] 7.4 Register citizen routes and add to NAV in `CitizenLayout.jsx` and `CitizenRoutes.jsx`
    - Add to `NAV_CIRCULAR` in `CitizenLayout.jsx`: `{ path: '/citizen/recycle-store', Icon: ..., label: 'Recycle Store' }` and `{ path: '/citizen/my-recycle-requests', Icon: ..., label: 'My Recycle Requests' }`
    - Add routes to `CitizenRoutes.jsx`: `<Route path="recycle-store" element={<RecycleStorePage />} />` and `<Route path="my-recycle-requests" element={<MyRecycleRequests />} />`
    - Import new components in `CitizenRoutes.jsx`
    - _Requirements: 13.1_

- [ ] 8. Checkpoint — full feature wired end-to-end
  - Ensure all tests pass, ask the user if questions arise
  - Verify admin can add an item and it appears in the citizen store
  - Verify citizen can request an item and stock decrements
  - Verify real-time socket update works (open two browser tabs)

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The `CATEGORIES` constant should be defined once in `server/models/RecycleItem.js` and imported wherever needed on the backend; replicate the array as a constant in the frontend files
- Admin needs to see ALL items (including unavailable) in the management page — consider adding an `?adminView=true` query param that bypasses the `status: 'available'` filter when the request comes from an admin endpoint, or create a separate `GET /api/recycle-store/admin/items` route protected by `adminProtect`
- The Socket.io client in the citizen frontend should use the existing socket instance already set up in the project (check `client/src/shared/` for any existing socket context or utility)
- Property tests use fast-check with `mongodb-memory-server` for in-process MongoDB — no external services needed
