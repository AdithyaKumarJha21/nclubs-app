# Dashboard System Deep Dive (President / Faculty / Student)

This document is an implementation-faithful analysis of the current React Native + Expo + Supabase codebase. It describes what exists now, including missing tools where requested features are not implemented.

---

## DASHBOARD: President

### 1️⃣ Overview
- **Purpose**: Home dashboard for president-only navigation to club management, events, attendance history, and president transfer. Also provides notification shortcut and profile/settings menu actions.
- **Entry condition (role logic)**:
  - Screen hard-checks `user.role === "president"`; otherwise redirects to `/login`.
- **Redirect flow**:
  - If auth loading: returns `null`.
  - If not president: `router.replace("/login")`.
  - Logout action signs out via Supabase then routes to login.

### 2️⃣ Top-Level Menu Options
- Manage Clubs
- Manage Events
- Attendance History
- Change President
- Notifications (header icon)
- Settings dropdown:
  - Edit Profile
  - Change Password
  - Calendar
  - Dark/Light mode toggle
  - Logout

---

## TOOL NAME: Manage Clubs

### A. Purpose
- Lists all clubs and opens individual club profile pages.
- For presidents/faculty/admin (when assigned), club profile allows edit of text sections, logo, gallery, and files.

### B. Entry Condition
- Route is reachable from president dashboard button.
- No explicit role guard in `ClubsScreen`; data availability and edit rights are controlled per-club by `canManageClub(clubId)`.
- Club ownership/assignment checks happen in `ClubProfileScreen` through `services/permissions.canManageClub`.

### C. UI Blocks
- **Block 1: Club List Section (`ClubsScreen`)**
  - UI: title (`Manage Clubs` for non-student), 3-column grid cards.
  - Inputs: search field.
  - Buttons: club cards navigate to `/club-profile?clubId=...`.
- **Block 2: Club Profile Header**
  - UI: title, logo preview, club name field/read-only text.
- **Block 3: Edit Control Row**
  - Non-editing: `Edit` button (manager only).
  - Editing: `Save`, `Cancel`.
- **Block 4: Logo Upload**
  - `Choose Image` / `Change Logo` button.
  - Optional `Remove` button.
  - Live preview + selected filename.
- **Block 5: Text Sections**
  - EditableTextSection for:
    - About Us
    - What to Expect
    - Achievements
- **Block 6: Gallery Management (`ClubGallery`)**
  - Add images, remove pending, upload batch, delete existing image.
  - Fullscreen modal with Prev/Next navigation.
- **Block 7: Files Management (`ClubFilesSection`)**
  - Choose file, upload, pending file display.
  - View/open file.
  - Delete file (manager only).

### D. Form Structure
- **Club Name**
  - Type: TextInput
  - Required: not explicitly validated, but saved as current text
  - Default: existing club name
- **Club Logo File**
  - Type: DocumentPicker (image)
  - Required: no
  - Validation:
    - MIME/extension: jpg/jpeg/png
    - max 2MB
  - Error alerts: invalid format / file too large / upload failed
- **About Us / What to Expect / Achievements**
  - Type: multiline text area through `EditableTextSection`
  - Required: no
  - Default: current section content or empty
- **Gallery Images**
  - Type: multi DocumentPicker images
  - Rules:
    - max 5 images total per club
    - jpg/jpeg/png
    - max 5MB each
- **Club Files**
  - Type: single DocumentPicker
  - Rules:
    - file types: PDF/PNG/JPEG
    - max 10MB
    - max 4 files (non-logo) per club

### E. User Interaction Flow
1. User opens Manage Clubs.
2. Clubs list loads from `clubs` and latest logo fallback from `club_files`.
3. User searches (client-side filter) and opens club profile.
4. Profile fetches club metadata + sections + logo file.
5. Permission check runs via `canManageClub`.
6. If manager, user enters edit mode.
7. User optionally changes logo, text sections, gallery, files.
8. Save path updates club row, upserts sections, inserts/deletes logo metadata, optionally uploads storage object.
9. Success alerts shown; realtime subscriptions refresh UI on db changes.

### F. Backend Interaction
- **Load clubs list**
  - Service: direct `supabase` in `ClubsScreen`
  - Method: `from("clubs").select(...).order("name")`
  - Table: `clubs`
- **Logo fallback lookup**
  - `from("club_files").select(...).order(created_at desc)`
  - Table: `club_files`
- **Club profile load**
  - `clubs`, `club_sections`, `club_files`
- **Permission check**
  - `services/permissions.canManageClub`
  - Reads: `profiles`, `roles`, `faculty_assignments`, `president_assignments`
- **Logo upload**
  - Storage bucket: `club-logos`
  - DB update: `clubs.logo_url`, insert/delete in `club_files`
- **Sections update**
  - `club_sections` select/update/insert by title
- **Gallery**
  - Bucket: `club-public`
  - Table: `club_gallery_images`
- **Files**
  - Bucket: `club_public`
  - Table: `club_files`
- **Realtime dependencies**
  - Channels subscribed to `clubs`, `club_sections`, `club_files`, `club_gallery_images`

### G. Security Notes
- UI edit permission is assignment-based (`canManageClub`).
- DB enforcement is expected from RLS:
  - `user_can_manage_club` helper function in SQL setup docs.
  - policies for `club_files`, `club_gallery_images`, and storage objects.
- Unauthorized update/delete paths alert with `Not authorized` or backend message.

### H. Edge Cases
- Missing `logo_url` column handled by progressive select fallback.
- Missing insert columns (`uploader_id` vs `uploaded_by`) handled by retry payload variants.
- File validation failures show alerts.
- Storage upload failures abort save/upload path.
- Missing `clubId` shows safe empty states.
- Missing assignment => read-only mode.

### I. Draftbit Rebuild Specification
- **Component**: Club Grid
  - Label: Manage Clubs
  - Placeholder: Search clubs
  - Action: open club detail
  - External function: `loadClubs()`, `onClubPress(clubId)`
  - Loading indicator: yes
  - Error state: yes
- **Component**: Club Editor Form
  - Label: Club Name, About Us, What to Expect, Achievements
  - Action: save/cancel
  - External function: `handleSaveEdit()`
  - Loading: yes (`isUploadingLogo`)
  - Error state: yes (alerts)
- **Component**: Logo Uploader
  - Action: choose/remove/upload preview
  - External function: `handleChooseLogo()`, `handleRemoveLogo()`, `uploadPendingLogoIfAny()`
- **Component**: Gallery Manager
  - Action: add images, upload pending, delete, fullscreen preview
  - External function: `chooseImages()`, `uploadPending()`, `deleteImage(id)`
- **Component**: Files Manager
  - Action: choose/upload/view/delete
  - External function: `chooseFile()`, `uploadFile()`, `openFile(file)`, `deleteFile(file)`

---

## TOOL NAME: Event Management

### A. Purpose
- Shows active upcoming events for clubs managed by current president/faculty/admin.
- Supports add event, soft-delete event, and per-event attendance control screen.

### B. Entry Condition
- Allowed roles: faculty, president, admin.
- Unauthorized users see `Not authorized.`
- Club scope from `getMyManagedClubIds()`.

### C. UI Blocks
- **Block 1: Header + Add Event button**
- **Block 2: Assignment warning/error text**
- **Block 3: Event list cards**
  - title/date/time/location
  - manage attendance button
  - delete button
- **Block 4: Event creation modal**

### D. Form Structure (Add Event)
- **Event Title** (required)
- **Event Date YYYY-MM-DD** (required, regex enforced)
- **Start Time HH:MM** (required, regex enforced)
- **End Time HH:MM** (required, regex enforced, must be > start)
- **Location** (required)
- **Description** (optional)
- Default values: empty on modal open/close reset

### E. User Interaction Flow
1. Open Manage Events.
2. Load managed clubs and active events (`status=active`, `end_time > now`).
3. Tap `+ Add Event`.
4. Fill form; frontend validation runs.
5. Submit triggers `createEvent()`.
6. On success modal closes and list refreshes.
7. Delete flow uses confirmation alert then soft-deletes (`status=deleted`).
8. Manage Attendance button opens event detail `/president/events/[id]`.

### F. Backend Interaction
- Services:
  - `getMyManagedClubIds()`
  - `listEventsForClubIds(clubIds)`
  - `createEvent(input)`
  - `deleteManagedEvent(eventId, clubIds)`
- Supabase:
  - `events` table (select/insert/update)
  - auth user lookup in event create
- RLS dependency:
  - `events` insert/update policies required for managed roles.

### G. Security Notes
- Role guard in screen.
- Club-scoped query + delete update constrained by `.in("club_id", clubIds)`.
- On unauthorized insert/delete, code handles `42501` with error alerts.

### H. Edge Cases
- No club assignment disables add event and shows warning.
- Empty list state shown when no upcoming active events.
- Delete button disabled while deleting specific item.

### I. Draftbit Rebuild Specification
- **Component**: Event Management List
  - Action: open detail/delete
  - External function: `fetchEventsForRole()`, `handleDeleteEvent()`
- **Component**: Add Event Modal
  - Action: validate + submit
  - External: `handleCreateEvent(formData)`
  - Loading: yes
  - Error states: validation alerts + API errors

---

## TOOL NAME: Add Event
- Implemented via `EventCreationModal` as described above.

## TOOL NAME: Edit Event
- **Status**: Not implemented in current codebase (no edit form/action for existing events).

## TOOL NAME: Delete Event
- Implemented in event management list with confirmation alert and soft delete to `status="deleted"`.

## TOOL NAME: Event Date / Event Location / Event Description
- Implemented as add-event form fields only.

## TOOL NAME: Event Image
- **Status**: Not implemented for events (no event image upload/display field).

## TOOL NAME: Registration toggle
- Implemented indirectly as attendance toggle (`qr_enabled`) in president event detail:
  - `Generate Attendance` => enables event attendance (`qr_enabled=true`, token generated)
  - `Disable Attendance` => `qr_enabled=false`

---

## TOOL NAME: Attendance History

### A. Purpose
- Dual-mode screen:
  - student: event attendance status list
  - faculty/president/admin: event list → selected event student scans

### B. Entry Condition
- Requires authenticated user; no explicit role block beyond mode selection.
- Role branching uses `utils/permissions.isStudentView` and `isFacultyView`.

### C. UI Blocks
- **Block 1:** title
- **Block 2 (Student):** `AttendanceList` with search/filter dropdown and attended pill states
- **Block 3 (Faculty/President):** event search input + event list
- **Block 4 (Faculty/President selected event):** student search input + attendance student list + back button

### D. Form Structure
- Event search input: text, optional
- Student search input: text, optional
- Student view filter options: all / attended / unattended / latest

### E. User Interaction Flow
1. Open Attendance History.
2. If student: load all events + user attendance rows and map attended flags.
3. If faculty/president/admin: load event list.
4. Select event => call RPC-backed attendance fetch by club and filter event.
5. Search students by USN/name/email.
6. Back returns to event list.

### F. Backend Interaction
- Student mode:
  - `events` select
  - `attendance` select by `student_id`
- Faculty/president mode:
  - `events` select with clubs join
  - `getAttendanceHistoryForClub(clubId)` RPC (`get_attendance_history_for_club`)
- Tables: `events`, `attendance`, `clubs`
- RPC output includes student_name/usn/scanned_at.

### G. Security Notes
- Actual access restrictions for attendance data rely on RPC/table RLS.
- Screen does not independently enforce assignment before showing events list.

### H. Edge Cases
- Missing `club_id` for selected event => logs error and empties student list.
- Unknown student names replaced with `Unknown student`.

### I. Draftbit Rebuild Specification
- **Component**: Attendance history container with conditional layouts.
- **External functions**: `fetchEvents()`, `fetchStudentAttendanceHistory()`, `fetchAttendanceForEvent()`.
- Loading indicators + empty states required in both modes.

---

## TOOL NAME: View attendees
- Implemented via `AttendanceStudentList` on selected event.

## TOOL NAME: Export attendance
- **Status**: UI stub exists (`ExportButton`) but not wired and has empty onPress.

## TOOL NAME: Date filtering
- Student mode sorts latest first; no explicit date picker. Event search matches date text.

## TOOL NAME: Search bar
- Implemented for events and students in faculty/president mode; also student-mode search in `AttendanceList`.

---

## TOOL NAME: Change President

### A. Purpose
- Transfers president role for current president’s assigned club to another user email.

### B. Entry Condition
- Strict role gate: only `president` can enter screen.

### C. UI Blocks
- Email input
- Confirmation text input (`YES`)
- Transfer button with loading spinner

### D. Form Structure
- **Email**
  - Type: TextInput
  - Required
  - Validation: regex email pattern
- **Confirmation**
  - Type: TextInput
  - Required
  - Validation: must normalize to `YES`

### E. User Interaction Flow
1. Enter new president email.
2. Type YES confirmation.
3. Tap transfer.
4. Resolve current auth user and current club via `president_assignments`.
5. Call RPC `transfer_president_by_email` with `p_confirm: "TRANSFER PRESIDENT"`.
6. On success alert + sign out + redirect login.

### F. Backend Interaction
- `supabase.auth.getUser()`
- `president_assignments` lookup by current user
- RPC: `transfer_president_by_email(p_club_id, p_new_president_email, p_confirm)`
- On success: `supabase.auth.signOut()`

### G. Security Notes
- Screen-level role gate + RPC expected to enforce DB-side authorization semantics.

### H. Edge Cases
- Session expired => alert and redirect login.
- No club assignment => transfer failed alert.
- RPC errors surfaced directly.

### I. Draftbit Rebuild Specification
- Inputs: email + confirmation
- Submit button disabled when validation fails
- External function: `handleTransferPresident()`
- Loading + inline validation states required

---

## TOOL NAME: Email input
- Implemented in Change President and Event Registration modals.

## TOOL NAME: Confirmation text input
- Implemented in Change President (`YES`).

## TOOL NAME: Transfer button
- Implemented in Change President.

## TOOL NAME: Logout trigger
- Implemented in dashboard dropdown and after successful president transfer.

---

## TOOL NAME: File Management

### A. Purpose
- Within club profile, manage documents/images tied to a club.

### B. Entry Condition
- Visible for everyone; upload/delete controls only for `isManager`.

### C. UI Blocks
- Helper text constraints
- Choose file / Upload buttons
- Pending file row
- Existing files list with metadata and view/delete actions

### D. Form Structure
- File picker accepts PDF/PNG/JPEG
- Max 10MB
- Max count 4

### E. Interaction Flow
1. Manager chooses file.
2. Validation runs.
3. Upload storage object to `club_public` bucket.
4. Insert metadata row in `club_files` (multi-schema payload fallback).
5. List refresh + success alert.

### F. Backend Interaction
- Storage: `club_public`
- Table: `club_files`
- Methods: select/insert/delete + storage remove/open public URL

### G. Security Notes
- isManager UI guard + RLS expected on storage/table.

### H. Edge Cases
- Unsupported type/size.
- Missing metadata columns handled by payload fallback.
- Storage insert success but DB insert fail triggers storage rollback remove.

### I. Draftbit Rebuild Specification
- File picker block
- Upload action block
- File list row with icon/thumbnail/view/delete
- External calls isolated (`loadFiles`, `uploadFile`, `openFile`, `deleteFile`)

---

## TOOL NAME: Upload file / Download file / Delete file / File preview
- Upload: implemented.
- Download/open: implemented via `Linking.openURL(publicUrl)`.
- Delete: implemented for managers.
- File preview: image thumbnails + external open for all files.

---

## TOOL NAME: Member Requests
- **Status**: Not implemented in current codebase.

## TOOL NAME: Approve / Reject
- **Status**: Not implemented.

## TOOL NAME: Notification triggers
- Implemented for sending notifications (separate notifications tool), not member request workflow.

---

## DASHBOARD: Faculty

### 1️⃣ Overview
- **Purpose**: Faculty/admin operational dashboard with club/event/attendance management and shared utilities.
- **Entry condition**:
  - Allowed roles: `faculty` or `admin`.
- **Redirect flow**:
  - Non-faculty/admin -> `/login`.

### 2️⃣ Top-Level Menu Options
- Manage Clubs
- Manage Events
- Attendance History
- Notifications (header)
- Settings dropdown:
  - Edit Profile
  - Change Password
  - Calendar
  - Dark/Light toggle
  - Logout

### Tool parity notes
- Faculty dashboard reuses the same implementations as president for:
  - Manage Clubs
  - Event Management
  - Attendance History
  - Notifications
  - Profile/password/logout/calendar menu actions
- Change President is **not** present in faculty dashboard buttons.

---

## TOOL NAME: Club Overview
- Implemented by `Manage Clubs` + `Club Profile` read/edit controls (assignment dependent).

## TOOL NAME: Event Viewing
- Implemented by Event Management event card list and Student Events screens (if navigated separately).

## TOOL NAME: Attendance Monitoring
- Implemented by Attendance History faculty-mode event→student traversal.

## TOOL NAME: File Viewing
- Implemented in `ClubFilesSection` (view for all; upload/delete for managers only).

## TOOL NAME: Notifications
- Inbox + create notification (faculty/admin/president compose allowed).

## TOOL NAME: Messaging
- **Status**: Not implemented as separate chat/messages feature.

---

## DASHBOARD: Student

### 1️⃣ Overview
- **Purpose**: Student-facing dashboard for club discovery, event browsing/registration/attendance submission, and attendance history.
- **Entry condition**:
  - `user.role === "student"` required in home screen.
- **Redirect flow**:
  - Non-student -> `/login`.

### 2️⃣ Top-Level Menu Options
- View Clubs
- Events
- Attendance History
- Notifications (header)
- Settings dropdown:
  - Edit Profile
  - Change Password
  - Calendar
  - Dark/Light toggle
  - Logout

---

## TOOL NAME: Browse Clubs
- Implemented via `ClubsScreen` in read-focused mode for students.
- Search by club name; open club profile.
- Student cannot edit club (isManager false).

## TOOL NAME: Join Club
- **Status**: Not implemented.

## TOOL NAME: Leave Club
- **Status**: Not implemented.

## TOOL NAME: Register Event
- Implemented in `EventDetailsScreen` + `EventRegistrationModal`.
- Fields:
  - Email (required, must include `@`)
  - USN (required, uppercased)
- Backend: `registerForEvent(eventId, usn, email)` -> `event_registrations` insert.
- Duplicate registration handled as success with `alreadyRegistered`.

## TOOL NAME: View Gallery
- Implemented in club profile gallery as read access for students.

## TOOL NAME: Download Files
- Implemented via file `View` action using public URL opening.

## TOOL NAME: Notification Center
- Implemented via notifications inbox.
- Student can view notifications (filtered by service logic + notification RLS policy expectations).
- Student cannot delete or compose notifications.

## TOOL NAME: Profile Settings
- Implemented via shared dropdown links:
  - Edit Profile
  - Change Password
  - Calendar
  - Theme toggle
  - Logout

---

## Student Event Tool Deep Dive

### Events List
- Search with 300ms debounce.
- Sort cycling button: date asc / date desc / name asc / club asc.
- Opens event details route.

### Event Details
- Loads in parallel:
  - event data
  - existing registration
  - local registration cache
  - attendance already-marked state
- If not registered and not prompted previously, auto-opens registration modal.
- Attendance button enabled only when:
  - user registered
  - event `qr_enabled=true`
  - now within start/end window
  - attendance not already marked

### Attendance Submission Modal
- Shows registered USN (read-only).
- Submit triggers `submitAttendance(event.id)`.
- Handles result variants:
  - success
  - already marked
  - forbidden (42501)
  - generic failure

---

## GLOBAL SECTION

### 1️⃣ Complete Navigation Flow Map
- **President**
  - Login/AuthContext resolve -> `/president-home`
  - President Home -> Manage Clubs -> Club Profile -> (Edit/Gallery/Files) -> back
  - President Home -> Manage Events -> Add Event / Delete Event / Manage Attendance -> back
  - President Home -> Attendance History -> Event list -> Student scans -> back
  - President Home -> Change President -> Transfer -> forced logout -> `/login`
  - President Home -> Notifications -> Compose (optional)
  - President Home -> Settings menu -> Edit Profile / Change Password / Calendar / Theme / Logout
- **Faculty/Admin**
  - Login/AuthContext resolve -> `/faculty-home`
  - Faculty Home -> Manage Clubs / Manage Events / Attendance History / Notifications
  - Settings menu parity with president
- **Student**
  - Login/AuthContext resolve -> `/student-home`
  - Student Home -> View Clubs -> Club Profile (read)
  - Student Home -> Events -> Event Details -> Register -> Attendance submit modal
  - Student Home -> Attendance History (student list mode)
  - Student Home -> Notifications
  - Settings menu parity

### 2️⃣ Complete Backend Dependency Map
- `services/events.ts`
  - Used by: Event Management, President Event Detail, Student Events
  - Functions: `getEventsForStudent`, `listEventsForClubIds`, `createEvent`, `deleteManagedEvent`, `getEventById`, `enableEventAttendance`, `disableEventAttendance`
- `services/attendance.ts`
  - Used by: Student Event Detail
  - Functions: `submitAttendance`, `hasMarkedAttendance`, `markAttendance`
- `services/registrations.ts`
  - Used by: EventRegistrationModal, EventDetailsScreen
  - Functions: `registerForEvent`, `getMyRegistration`, local cache helpers
- `services/permissions.ts`
  - Used by: ClubProfileScreen, PresidentEventManagementScreen
  - Functions: `canManageClub`, `getMyManagedClubIds`
- `services/assignments.ts`
  - Used by: events + notifications service internals
  - Functions: `getMyClubs`, `resolveFacultyClubId`, etc.
- `services/attendanceHistory.ts`
  - Used by: AttendanceHistoryScreen
  - Function: `getAttendanceHistoryForClub` (RPC)
- `services/notifications.ts`
  - Used by: Notifications inbox/composer
  - Functions: `getVisibleNotifications`, `sendNotification`, `deleteNotification`, `getNotificationCountForClubToday`, `getNotificationClubOptions`
- `services/clubLogo.ts`
  - Used by: ClubProfileScreen logo URL resolve
- Direct `supabase` usage in screens/components:
  - ClubsScreen, ClubProfileScreen, ClubGallery, ClubFilesSection, EditProfileScreen, ChangePresidentScreen, AttendanceHistoryScreen

### 3️⃣ High Risk Functional Areas
- **Role redirect**
  - AuthContext route resolution and per-screen role guards are critical for correct dashboard access.
- **Change president**
  - Depends on `president_assignments` integrity + `transfer_president_by_email` RPC behavior.
- **Event creation**
  - Requires valid assignment resolution and insert RLS for `events`.
- **File upload**
  - Multi-step storage+db writes; partial failure handling relies on rollback logic.
- **Attendance export**
  - Currently not functionally implemented (button stub only).
- **RLS enforcement**
  - Many screens rely on DB/storage policies rather than only UI guards.

### 4️⃣ UI Rebuild Checklist
- President: [ ] Manage Clubs
- President: [ ] Add Event
- President: [ ] Edit Event (not implemented)
- President: [ ] Attendance
- President: [ ] Change President
- President: [ ] Notifications Inbox
- President: [ ] Notification Composer
- President: [ ] File Management
- President: [ ] Gallery Management
- President: [ ] Profile Menu Actions

- Faculty: [ ] Manage Clubs
- Faculty: [ ] Manage Events
- Faculty: [ ] Attendance Monitoring
- Faculty: [ ] File Viewing
- Faculty: [ ] Notifications Inbox
- Faculty: [ ] Notification Composer
- Faculty: [ ] Profile Menu Actions

- Student: [ ] Browse Clubs
- Student: [ ] Join Club (not implemented)
- Student: [ ] Leave Club (not implemented)
- Student: [ ] Events List
- Student: [ ] Event Registration Modal
- Student: [ ] Attendance Submission Modal
- Student: [ ] Attendance History
- Student: [ ] Gallery Viewing
- Student: [ ] File Download/View
- Student: [ ] Notification Center
- Student: [ ] Profile Settings Actions

