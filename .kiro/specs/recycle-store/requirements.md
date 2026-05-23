# Requirements Document

## Introduction

The Recycle Store is a new feature for the EcoLoop Green Champion platform that allows admins to list recyclable items and citizens to browse, search, filter, and request those items. The feature includes full admin CRUD management, a citizen-facing store with cart/request flow, real-time item updates via Socket.io, and an admin analytics dashboard. It integrates into the existing EcoLoop stack (Node.js/Express/MongoDB backend, React/Vite/Tailwind frontend) without introducing new dependencies.

## Glossary

- **Recycle_Store**: The complete feature encompassing item management, citizen browsing, and request handling.
- **RecycleItem**: A MongoDB document representing a recyclable item listed by an admin, with fields: itemName, category, description, price, stock, image, status, isFeatured, viewCount.
- **RecycleRequest**: A MongoDB document representing a citizen's request for a RecycleItem, with fields: userId, itemId, quantity, status, message.
- **Admin**: An authenticated administrator using the admin panel, identified by a JWT verified with `JWT_SECRET + '_admin'`.
- **Citizen**: An authenticated platform user with role `Citizen` or `GreenChampion`, identified by a JWT verified with `JWT_SECRET`.
- **Item_Controller**: The `recycleStoreController.js` Express controller handling all recycle store business logic.
- **Item_Router**: The `recycleStoreRoutes.js` Express router mounted at `/api/recycle-store`.
- **Store_Page**: The citizen-facing `RecycleStorePage` React component at `client/src/citizen/recycleStore/`.
- **Manage_Page**: The admin-facing `RecycleStoreManage` React component at `admin/src/pages/`.
- **Analytics_Page**: The admin-facing `RecycleAnalytics` React component at `admin/src/pages/`.
- **CATEGORIES**: The fixed list of 10 item categories: Electronics, Books, Plastic Items, Furniture, Metal Scrap, Paper Waste, Clothes, Toys, Appliances, Other Recyclable Items.

---

## Requirements

### Requirement 1: Recycle Item Data Model

**User Story:** As a developer, I want a well-defined RecycleItem data model, so that item data is consistently structured and validated across the system.

#### Acceptance Criteria

1. THE Item_Controller SHALL use a Mongoose schema with fields: `itemName` (String, required, trimmed), `category` (String, required, enum CATEGORIES), `description` (String, default empty), `price` (Number, required, min 0), `stock` (Number, required, min 0), `image` (String, default empty), `status` (String, enum `['available','unavailable']`, default `'available'`), `isFeatured` (Boolean, default false), `viewCount` (Number, default 0), and Mongoose `timestamps`.
2. THE RecycleItem model SHALL enforce that `category` is one of the 10 fixed CATEGORIES values at the database level using a Mongoose enum.
3. THE RecycleItem model SHALL enforce that `price` is greater than or equal to 0 and `stock` is greater than or equal to 0 using Mongoose `min` validators.
4. THE RecycleItem model SHALL define MongoDB indexes on `category`, `status`, `isFeatured`, and `createdAt` fields for query performance.

### Requirement 2: Recycle Request Data Model

**User Story:** As a developer, I want a well-defined RecycleRequest data model, so that citizen requests are consistently tracked with full lifecycle status.

#### Acceptance Criteria

1. THE Item_Controller SHALL use a Mongoose schema with fields: `userId` (ObjectId ref User, required), `itemId` (ObjectId ref RecycleItem, required), `quantity` (Number, required, min 1), `status` (String, enum `['Pending','Approved','Rejected','Completed']`, default `'Pending'`), `message` (String, default empty), and Mongoose `timestamps`.
2. THE RecycleRequest model SHALL define MongoDB indexes on `userId`, `itemId`, `status`, and `createdAt` fields.

### Requirement 3: Admin — Add Recycle Item

**User Story:** As an admin, I want to add new recyclable items with full details and an image, so that citizens can browse and request them.

#### Acceptance Criteria

1. WHEN an admin submits a POST request to `/api/recycle-store/items` with valid `itemName`, `category`, `price`, and `stock`, THEN THE Item_Controller SHALL create a new RecycleItem document and return HTTP 201 with the saved item.
2. WHEN an admin submits a POST request to `/api/recycle-store/items` with an image file, THEN THE Item_Controller SHALL upload the image via the existing `uploadMiddleware.js` (Multer + Cloudinary) and store the resulting URL in the `image` field.
3. WHEN a new RecycleItem is successfully created, THEN THE Item_Controller SHALL emit the `recycle-store:new-item` socket event with the new item as payload using `socket.emitToAll`.
4. IF the POST request to `/api/recycle-store/items` is missing `itemName`, `category`, `price`, or `stock`, THEN THE Item_Controller SHALL return HTTP 400 with a descriptive error message.
5. IF the POST request to `/api/recycle-store/items` contains a `category` value not in CATEGORIES, THEN THE Item_Controller SHALL return HTTP 400 with a descriptive error message.
6. IF the POST request to `/api/recycle-store/items` is made without a valid admin JWT, THEN THE Item_Router SHALL return HTTP 401 via the `adminProtect` middleware.

### Requirement 4: Admin — Update Recycle Item

**User Story:** As an admin, I want to edit existing recycle items, so that I can keep item details, pricing, and stock accurate.

#### Acceptance Criteria

1. WHEN an admin submits a PUT request to `/api/recycle-store/items/:id` with valid fields, THEN THE Item_Controller SHALL update the RecycleItem document and return HTTP 200 with the updated item.
2. WHEN an admin submits a PUT request to `/api/recycle-store/items/:id` with a new image file, THEN THE Item_Controller SHALL upload the new image via `uploadMiddleware.js` and replace the `image` field.
3. IF the PUT request references an item id that does not exist, THEN THE Item_Controller SHALL return HTTP 404 with `{ message: 'Item not found.' }`.
4. IF the PUT request to `/api/recycle-store/items/:id` is made without a valid admin JWT, THEN THE Item_Router SHALL return HTTP 401.

### Requirement 5: Admin — Delete Recycle Item

**User Story:** As an admin, I want to delete recycle items, so that I can remove items that are no longer available or relevant.

#### Acceptance Criteria

1. WHEN an admin submits a DELETE request to `/api/recycle-store/items/:id`, THEN THE Item_Controller SHALL remove the RecycleItem document and return HTTP 200 with a success message.
2. IF the DELETE request references an item id that does not exist, THEN THE Item_Controller SHALL return HTTP 404 with `{ message: 'Item not found.' }`.
3. IF the DELETE request to `/api/recycle-store/items/:id` is made without a valid admin JWT, THEN THE Item_Router SHALL return HTTP 401.

### Requirement 6: Citizen — Browse Recycle Items

**User Story:** As a citizen, I want to browse all available recycle items with search and category filtering, so that I can find items I want to request.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/recycle-store/items`, THEN THE Item_Controller SHALL return only items where `status === 'available'`, sorted by `createdAt` descending, with pagination metadata `{ items, total, page, limit }`.
2. WHEN a GET request to `/api/recycle-store/items` includes a `category` query parameter, THEN THE Item_Controller SHALL return only available items matching that category.
3. WHEN a GET request to `/api/recycle-store/items` includes a `search` query parameter, THEN THE Item_Controller SHALL return only available items where `itemName` or `description` matches the search term (case-insensitive).
4. WHEN a GET request to `/api/recycle-store/items` includes `featured=true`, THEN THE Item_Controller SHALL return only available items where `isFeatured === true`.
5. THE Item_Controller SHALL apply a default page size of 20 items and SHALL NOT return more than 100 items per request.
6. THE Store_Page SHALL display items in a card-based grid layout with item image, name, category badge, price, stock availability, and a "Recycled Product" tag.
7. THE Store_Page SHALL display a featured items section at the top of the page when featured items exist.
8. THE Store_Page SHALL display a recently added items section showing the most recently created items.
9. THE Store_Page SHALL provide a search input that debounces user input by 300 milliseconds before triggering an API call.
10. THE Store_Page SHALL provide category filter pills for all 10 CATEGORIES plus an "All" option.

### Requirement 7: Real-time Item Updates

**User Story:** As a citizen, I want to see newly added items appear instantly without refreshing the page, so that I always see the latest available items.

#### Acceptance Criteria

1. WHEN the `recycle-store:new-item` socket event is received on the Store_Page, THE Store_Page SHALL prepend the new item to the displayed item list without requiring a page refresh.
2. THE Store_Page SHALL register the `recycle-store:new-item` socket listener on component mount and remove it on component unmount.

### Requirement 8: Citizen — Request an Item

**User Story:** As a citizen, I want to request a recycle item, so that I can obtain recyclable goods from the platform.

#### Acceptance Criteria

1. WHEN a citizen submits a POST request to `/api/recycle-store/request` with a valid `itemId`, `quantity` ≥ 1, and a valid citizen JWT, THEN THE Item_Controller SHALL create a RecycleRequest with `status: 'Pending'` and return HTTP 201.
2. WHEN a RecycleRequest is successfully created, THEN THE Item_Controller SHALL decrement the referenced RecycleItem's `stock` by the requested `quantity`.
3. WHEN a RecycleRequest causes the RecycleItem's stock to reach 0, THEN THE Item_Controller SHALL set the RecycleItem's `status` to `'unavailable'`.
4. IF the POST request to `/api/recycle-store/request` references an item with `status === 'unavailable'`, THEN THE Item_Controller SHALL return HTTP 400 with `{ message: 'Item is currently unavailable.' }`.
5. IF the POST request to `/api/recycle-store/request` specifies a `quantity` greater than the item's current `stock`, THEN THE Item_Controller SHALL return HTTP 400 with a message indicating the available stock count.
6. IF the POST request to `/api/recycle-store/request` references an item id that does not exist, THEN THE Item_Controller SHALL return HTTP 404 with `{ message: 'Item not found.' }`.
7. IF the POST request to `/api/recycle-store/request` is made without a valid citizen JWT, THEN THE Item_Router SHALL return HTTP 401.
8. THE Store_Page SHALL display item availability status and SHALL disable the request action for items with `status === 'unavailable'` or `stock === 0`.

### Requirement 9: Citizen — View My Requests

**User Story:** As a citizen, I want to view my recycle item request history with status tracking, so that I can monitor the progress of my requests.

#### Acceptance Criteria

1. WHEN a citizen submits a GET request to `/api/recycle-store/requests/my` with a valid citizen JWT, THEN THE Item_Controller SHALL return all RecycleRequest documents for that citizen, sorted by `createdAt` descending, with the referenced item details populated.
2. THE Store_Page SHALL display request status badges for each of the four statuses: Pending, Approved, Rejected, Completed.

### Requirement 10: Admin — View All Requests

**User Story:** As an admin, I want to view all citizen recycle requests, so that I can manage and fulfill them.

#### Acceptance Criteria

1. WHEN an admin submits a GET request to `/api/recycle-store/requests` with a valid admin JWT, THEN THE Item_Controller SHALL return all RecycleRequest documents sorted by `createdAt` descending, with `userId` and `itemId` populated.
2. IF the GET request to `/api/recycle-store/requests` is made without a valid admin JWT, THEN THE Item_Router SHALL return HTTP 401.

### Requirement 11: Admin — Analytics

**User Story:** As an admin, I want to view analytics for the recycle store, so that I can understand usage patterns and inventory health.

#### Acceptance Criteria

1. WHEN an admin submits a GET request to `/api/recycle-store/analytics` with a valid admin JWT, THEN THE Item_Controller SHALL return `{ totalItems, outOfStock, totalRequests, mostViewedCategory }`.
2. THE Item_Controller SHALL compute `totalItems` as the count of all RecycleItem documents.
3. THE Item_Controller SHALL compute `outOfStock` as the count of RecycleItem documents where `stock === 0`.
4. THE Item_Controller SHALL compute `totalRequests` as the count of all RecycleRequest documents.
5. THE Item_Controller SHALL compute `mostViewedCategory` as the category with the highest total `viewCount` sum across all items in that category.
6. IF the GET request to `/api/recycle-store/analytics` is made without a valid admin JWT, THEN THE Item_Router SHALL return HTTP 401.

### Requirement 12: Admin — Frontend Management UI

**User Story:** As an admin, I want a dedicated management page in the admin panel, so that I can perform all CRUD operations on recycle items through a UI.

#### Acceptance Criteria

1. THE Manage_Page SHALL be accessible at `/admin/recycle-store` and SHALL be added to the `NAV` array in `AdminLayout.jsx`.
2. THE Manage_Page SHALL display all recycle items in a table with columns for image, name, category, price, stock, status, featured flag, and action buttons (edit, delete).
3. THE Manage_Page SHALL provide an "Add Item" button that opens an `ItemFormModal` with fields for all RecycleItem properties.
4. THE Manage_Page SHALL provide an "Edit" action per item that opens the `ItemFormModal` pre-populated with the item's current values.
5. THE Manage_Page SHALL provide a "Delete" action per item with a confirmation prompt before deletion.
6. THE Manage_Page SHALL provide category filter tabs to filter the displayed item list by category.
7. THE Analytics_Page SHALL be accessible at `/admin/recycle-analytics` and SHALL display stat cards for total items, out-of-stock count, total requests, and most-viewed category.
8. THE Manage_Page SHALL use the admin-token from `localStorage.getItem('admin-token')` for all API requests, following the existing admin auth pattern.

### Requirement 13: Citizen — Frontend Store UI

**User Story:** As a citizen, I want a dedicated Recycle Store page in the citizen portal, so that I can browse and request items through a mobile-responsive UI.

#### Acceptance Criteria

1. THE Store_Page SHALL be accessible at `/citizen/recycle-store` and SHALL be added to the `NAV_CIRCULAR` array in `CitizenLayout.jsx`.
2. THE Store_Page SHALL use the eco-friendly green theme consistent with the existing EcoLoop citizen UI (Tailwind green palette, card-based layout, matching border-radius and shadow conventions).
3. THE Store_Page SHALL be mobile-responsive, adapting the card grid from 1 column on mobile to 2 columns on tablet to 3–4 columns on desktop.
4. THE Store_Page SHALL use the citizen JWT from `localStorage.getItem('token')` for authenticated API requests, following the existing citizen auth pattern.
5. WHERE a citizen is not authenticated, THE Store_Page SHALL redirect to the login page when attempting to submit a request.

### Requirement 14: Server Registration

**User Story:** As a developer, I want the recycle store routes registered in the Express server, so that all API endpoints are reachable.

#### Acceptance Criteria

1. THE server.js file SHALL register the recycle store router with `app.use('/api/recycle-store', require('./routes/recycleStoreRoutes'))`.
