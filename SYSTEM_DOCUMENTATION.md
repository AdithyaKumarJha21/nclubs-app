# NCLUBS Functional System Documentation

## Scope and Method
- This document is an analysis-only functional blueprint of the current React Native + Expo Router + Supabase codebase.
- No functional rewrites are proposed; all logic below reflects current implementation behavior.
- UI concerns and backend/service concerns are separated per screen block.

---

SCREEN NAME: Login Page (`screens/LoginScreen.tsx`)
1️⃣ Purpose
- Authenticates student/president users using email + password.
- Rejects faculty/admin users from this login path and redirects them to faculty login route.
- Supports contextual top message for signed-out and password reset scenarios.

2️⃣ Navigation Entry Points
- Entered from `/login` route (default app landing from `/`).
- Entered from Signup page via “Already registered? Login”.
- Entered from Faculty Login page via “Back to Student Login”.
- Entered after password reset (`router.replace('/login')` from reset flow).
- Reach conditions:
  - Route must be public auth route.
  - No hard auth guard on mount in this screen; guard is managed globally by `AuthContext` auto-routing.

3️⃣ UI Blocks (Break into logical UI sections)

Block Name: Header + Context Message
- Visual purpose: Welcome title and optional status context.
- UI elements: Title text, conditional info text.
- State variables: computed `topMessage`.
- Hooks used: `useMemo` (derives message from route params).
- Validation rules: N/A.
- Loading states: N/A.
- Error states: N/A.
- User Interaction Flow:
  1. Screen reads query params (`signedOut`, `reason`, `email`).
  2. Message shows for `reason=password_reset` or signed-out indicators.
- Backend Interaction: none.
- Security/Session Notes: top-message-only logic; no auth mutation.
- Edge Cases: unknown params silently ignored.

Block Name: Credentials Form
- Visual purpose: collect email/password.
- UI elements: email `TextInput`, password `TextInput`, password visibility toggle icon button.
- State variables: `email`, `password`, `isPasswordVisible`, `isSubmitting`, `errorMessage`.
- Hooks used: `useState`, `useEffect` (prefills email param).
- Validation rules:
  - both email and password required.
  - email must satisfy `isValidEmail` regex.
- Loading states: inputs disabled while `isSubmitting`.
- Error states: inline `errorMessage` text.
- User Interaction Flow:
  1. User enters email/password.
  2. Presses Login.
  3. Frontend validates required + email format.
  4. Calls Supabase password auth.
  5. Fetches profile role.
  6. If role faculty/admin -> local signOut + error + alert.
  7. If role president -> `/president-home`; else `/student-home`.
- Backend Interaction:
  - Service file: direct `services/supabase.ts` client.
  - Methods:
    - `supabase.auth.signInWithPassword({ email, password })`
    - `supabase.from('profiles').select('roles(name)').eq('id', user.id).single()`
    - `supabase.auth.signOut({ scope: 'local' })` for forbidden role.
  - Success response expected: authenticated `data.user.id` + profile row with role.
  - Failure response: auth error/profile error -> show error, remain on screen.
- Security/Session Notes:
  - Role gating enforced before dashboard routing.
  - Depends on profile-role join; if missing, session is cleared locally.
  - RLS/permission on `profiles` select impacts login completion.
- Edge Cases:
  - Invalid credentials -> “Invalid email or password”.
  - Missing profile permission -> “Unable to determine user role.” and local sign-out.
  - Faculty/admin using student login -> blocked with alert.

Block Name: Secondary Navigation Links
- Visual purpose: branch to password recovery, signup, faculty login.
- UI elements: three text buttons.
- State variables: none.
- Hooks: none.
- Validation/loading/error: disabled only by natural UX (no explicit disable).
- User Interaction Flow: pushes to `/forgot-password`, `/signup`, `/faculty-login`.
- Backend Interaction: none.
- Security Notes: route-level only.
- Edge Cases: none.

4️⃣ Business Logic Extracted
- Required dual-stage authentication logic: password sign-in then profile role lookup.
- Mandatory role exclusion for faculty/admin on student login with forced local sign-out.
- Email normalization to lowercase before auth.
- Success routing: president to `/president-home`, student/default to `/student-home`.

5️⃣ Draftbit Rebuild Requirements
- Components:
  - Input: Email (`placeholder: you@nmit.ac.in`, validation: required + email regex).
  - Input: Password (`placeholder: Enter password`, validation: required).
  - Toggle/Icon button: show/hide password.
  - Button: Login.
  - Link buttons: Forgot Password, New user? Register, Login as Faculty.
  - Text: contextual info + error label.
- Actions:
  - Login button: call `supabase.auth.signInWithPassword`, then profile-role fetch, then conditional `signOut`/redirect.
  - Forgot: navigate `/forgot-password`.
  - Register: navigate `/signup`.
  - Faculty: navigate `/faculty-login`.
- Loading indicator requirement: replace Login label with spinner while submitting.
- Error requirement: inline error text + access-restricted alert for wrong portal.

6️⃣ Dependencies
- Imported services: `supabase` from `services/supabase`.
- Context usage: none directly (global auth context still active in app root).
- Navigation hooks: `useRouter`, `useLocalSearchParams`.
- Environment variables: indirectly `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` through Supabase client.

---

SCREEN NAME: Signup Page (`screens/SignupScreen.tsx`)
1️⃣ Purpose
- Registers new student user with email/password and profile metadata (name, usn).
- Prevents duplicate USN before sign-up.
- Redirects to OTP verification flow.

2️⃣ Navigation Entry Points
- Entered from Login screen via “New user? Register”.
- Route `/signup` is listed as public auth route.
- No hard session guard inside page.

3️⃣ UI Blocks

Block Name: Registration Form
- Visual purpose: capture identity + credentials.
- UI elements: inputs for Full Name, USN, College Email, Password, Confirm Password.
- State variables: `name`, `usn`, `email`, `password`, `confirmPassword`, `isSubmitting`, `errorMessage`.
- Hooks: `useState`.
- Validation rules:
  - required: name/usn/email.
  - email regex via `isValidEmail`.
  - password min length 8.
  - password must contain at least one uppercase and one number.
  - confirm must match.
- Loading states: entire submit button disabled; spinner during submission.
- Error states: inline `errorMessage`.
- User Interaction Flow:
  1. User fills fields.
  2. Presses Create Account.
  3. Frontend validates all constraints.
  4. USN uniqueness check on `profiles` table.
  5. Calls Supabase `auth.signUp` with user metadata in `options.data`.
  6. On success pushes `/verify-otp` with email/name/usn query params.
- Backend Interaction:
  - `supabase.from('profiles').select('id').eq('usn', usn).maybeSingle()`.
  - `supabase.auth.signUp({ email, password, options: { data: { name, usn }}})`.
  - Success: no error, proceeds to OTP page.
  - Failure: show returned error.
- Security/Session Notes:
  - No explicit role set in this screen; relies on backend defaults/profile policies.
  - USN duplicate prevention depends on profile visibility and RLS permissiveness.
- Edge Cases:
  - USN already registered: explicit blocking message.
  - USN check query error: raw `usnCheckError.message` shown.
  - Network/auth failure: message from Supabase.

Block Name: Password Policy Hint
- Visual purpose: user guidance for password format.
- UI elements: informational text.
- State/hook: derived from current rule constants.
- Validation/loading/error: none.

Block Name: Existing Account Link
- Visual purpose: return to login.
- UI elements: “Already registered? Login” link.
- Action: route push `/login`.

4️⃣ Business Logic Extracted
- USN pre-check must occur before auth signup.
- Password complexity enforcement (length + uppercase + number + match) must remain unchanged.
- OTP route requires passing email/name/usn in query for downstream profile patching.

5️⃣ Draftbit Rebuild Requirements
- Components:
  - Inputs: Full Name, USN (caps), College Email, Password, Confirm Password.
  - Text: password policy info, inline error.
  - Button: Create Account with loading spinner.
  - Link: Already registered? Login.
- Service actions:
  - On create: run USN lookup then `auth.signUp` with metadata.
  - On success navigate to `/verify-otp` with URL params.
- Validation requirements: exactly current constraints.
- Error requirement: show first failing validation or backend message.

6️⃣ Dependencies
- Services: `supabase`.
- Context: none.
- Navigation: `useRouter`.
- Env vars: through Supabase client.

---

SCREEN NAME: OTP Confirmation Page (`app/verify-otp.tsx`)
1️⃣ Purpose
- Verifies signup OTP for email confirmation.
- Updates/creates profile metadata (name/usn/email) after OTP success.
- Resolves role and routes to role-specific dashboard.
- Supports OTP resend.

2️⃣ Navigation Entry Points
- Entered after signup success with required query params (`email`, `name`, `usn`).
- Can be returned to from back button to prior route.
- Reach conditions:
  - email context should exist; otherwise action buttons emit error message.

3️⃣ UI Blocks

Block Name: OTP Context + Input
- Visual purpose: show target email and collect 6-digit OTP.
- UI elements: read-only email input, OTP input, status/error text.
- State: `otp`, `message`, `isVerifying`, `isResending`.
- Hooks: `useState`, `useLocalSearchParams`.
- Validation rules:
  - email context required.
  - sanitized OTP must be exactly 6 digits.
- Loading states:
  - Verify button shows spinner while `isVerifying`.
  - Resend label switches to “Resending…” while `isResending`.
- Error states: single `message` text (also used for success confirmation after resend).
- User Interaction Flow:
  1. User enters numeric OTP.
  2. Press Verify.
  3. Client tries `verifyOtp(type: 'email')`; if “invalid type” then retries `type: 'signup'`.
  4. On success obtains authenticated user via `auth.getUser()`.
  5. Updates profile row with name/usn/email; retry update once, then fallback upsert.
  6. Fetches role (`profiles.roles(name)`), resolves role, routes home.
- Backend Interaction:
  - `supabase.auth.verifyOtp({ email, token, type: 'email'|'signup' })`
  - `supabase.auth.getUser()`
  - `supabase.from('profiles').update(profilePayload).eq('id', user.id)`
  - fallback: second update then `upsert({ id, ...profilePayload }, { onConflict: 'id' })`
  - role read: `supabase.from('profiles').select('roles(name)').eq('id', user.id).maybeSingle()`
  - Success route:
    - faculty/admin -> `/faculty-home`
    - president -> `/president-home`
    - default -> `/student-home`
  - Failure: set `message` and stay.
- Security/Session Notes:
  - Depends on OTP-generated authenticated session.
  - Role resolution relies on profiles/roles relationship visibility.
  - Profile write path depends on RLS allowing update/upsert for current `auth.uid()`.
- Edge Cases:
  - Invalid/expired OTP message normalization.
  - Missing email params blocks actions.
  - Profile update transient failure handled by retry+upsert fallback.

Block Name: Resend OTP
- Visual purpose: recover from expired OTP.
- UI elements: “Resend OTP” secondary button.
- User Interaction Flow:
  1. Calls `supabase.auth.resend({ email, type: 'signup' })`.
  2. On failure, fallback to `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true }})`.
  3. Sets success/failure message.
- Security/Session Notes: no role change; auth messaging only.

Block Name: Back Navigation
- Visual purpose: return to signup context.
- Action: `router.back()`.

4️⃣ Business Logic Extracted
- Two-mode OTP verify fallback (`email` -> `signup`) is critical compatibility behavior.
- Post-verify profile update with retry and upsert fallback is critical to avoid missing profile data.
- Role-based redirect immediately after OTP success must remain.

5️⃣ Draftbit Rebuild Requirements
- Components:
  - Read-only input: Email.
  - Numeric input: OTP (6 digits, sanitized).
  - Button: Verify (loading spinner).
  - Button: Resend OTP (loading text state).
  - Link/button: Back to Signup.
  - Message text area for status/errors.
- Actions:
  - Verify -> verifyOtp fallback chain -> getUser -> profile update/upsert -> fetch role -> redirect.
  - Resend -> resend signup OTP, fallback signInWithOtp.
  - Back -> navigation back.
- Validation: strict 6-digit OTP and required email context.
- Error/success messaging: display in the shared message slot.

6️⃣ Dependencies
- Services: `supabase`.
- Utils: `sanitizeOtp` from `utils/auth`.
- Navigation: `useRouter`, `useLocalSearchParams`.
- Env vars: through Supabase client.

---

SCREEN NAME: Forgot Password Page (`screens/ForgotPasswordScreen.tsx`)
1️⃣ Purpose
- Initiates password reset OTP delivery for existing users.
- Navigates to reset page with normalized email context.

2️⃣ Navigation Entry Points
- Entered from Login/Faculty Login via “Forgot Password?”.
- Route: `/forgot-password` (public).

3️⃣ UI Blocks

Block Name: Email Input + Send OTP CTA
- Visual purpose: capture account email and send OTP.
- UI elements: email input, Send OTP button.
- State: `email`, `loading`.
- Hooks: `useState`.
- Validation rules:
  - required email.
  - regex email format.
- Loading states: button text switches “Sending...”; button disabled.
- Error states: `Alert.alert` modal for invalid/failed states.
- User Interaction Flow:
  1. Normalize email to lowercase.
  2. Validate.
  3. Call `supabase.auth.signInWithOtp({ shouldCreateUser: false })`.
  4. On success alert and push `/reset-password?email=...`.
- Backend Interaction:
  - `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false }})`.
  - Success expected: OTP sent without creating new user.
  - Failure: alert with backend message.
- Security/Session Notes:
  - Uses OTP login mechanism for recovery, not direct reset API call.
  - Does not mutate password here.
- Edge Cases:
  - network/auth failure shows alert.
  - invalid email blocked client-side.

4️⃣ Business Logic Extracted
- Must preserve `shouldCreateUser: false` to avoid account creation from forgot flow.
- Must pass email param to reset page for OTP verification context.

5️⃣ Draftbit Rebuild Requirements
- Components: Email Input, Send OTP Button.
- Validation: required + email format.
- Action on press: call `auth.signInWithOtp` with non-create flag, then navigate `/reset-password` with email.
- Loading: disable button and show “Sending...”.
- Error: alert dialog for failures.

6️⃣ Dependencies
- Services: `supabase`.
- Navigation: `useRouter`.
- Context: none.
- Env vars: through Supabase client.

---

SCREEN NAME: Confirm Password / Reset Page (`screens/ResetPasswordScreen.tsx`)
1️⃣ Purpose
- Verifies OTP from email and updates account password.
- Forces re-login after password update by signing out session.

2️⃣ Navigation Entry Points
- Entered from Forgot Password with `email` query param.
- May also be entered from recovery deep-link callback (`/auth-callback` with type=recovery) if session exists.
- Reach conditions: email context should be present for operations.

3️⃣ UI Blocks

Block Name: Email Context + OTP + Password Inputs
- Visual purpose: collect reset credentials.
- UI elements: read-only email input, OTP input, new password input with eye toggle, confirm password input with eye toggle.
- State: `otp`, `newPassword`, `confirmPassword`, visibility toggles, `isSubmitting`, `isResending`.
- Hooks: `useState`, `useMemo` (normalize email param).
- Validation rules:
  - email context required.
  - all fields required.
  - OTP length must be 6.
  - new password min 8 chars.
  - new and confirm must match.
- Loading states:
  - submit button text “Updating...” while submitting.
  - resend button text “Resending...” while resending.
  - toggles disabled during submit/resend.
- Error states: `Alert.alert` messages for each validation/backend failure.
- User Interaction Flow:
  1. Validate fields.
  2. Verify OTP (`type: 'email'`).
  3. On verify success, call `auth.updateUser({ password })`.
  4. Sign out current session.
  5. Alert success and route `/login`.
- Backend Interaction:
  - `supabase.auth.verifyOtp({ email, token, type: 'email' })`
  - `supabase.auth.updateUser({ password: newPassword })`
  - `supabase.auth.signOut()`
  - resend: `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false }})`
- Security/Session Notes:
  - update password depends on verified temporary recovery session.
  - explicit sign-out prevents stale session usage.
- Edge Cases:
  - invalid/expired OTP gets specific resend guidance.
  - missing email context blocks both submit/resend.
  - network issues show alert.

Block Name: Action Buttons + Back
- Visual purpose: reset, resend, and back navigation.
- UI elements: primary submit button, secondary resend button, Back link.
- Actions: run submit/resend handlers or `router.back()`.

4️⃣ Business Logic Extracted
- OTP verification before password update is mandatory.
- Auto sign-out after password update is mandatory.
- Resend remains tied to `signInWithOtp(...shouldCreateUser:false)`.

5️⃣ Draftbit Rebuild Requirements
- Components:
  - Read-only Input: Email.
  - Input: OTP numeric (max 6).
  - Inputs: New Password + Confirm Password with visibility toggles.
  - Button: Verify OTP & Reset Password.
  - Button: Resend OTP.
  - Link: Back.
- Validation: preserve exact sequence and messages.
- Service functions:
  - `verifyOtp` then `updateUser(password)` then `signOut` then navigate login.
  - resend OTP function.
- Loading: dynamic button labels and disable all interactive actions.
- Error: alert modals.

6️⃣ Dependencies
- Services: `supabase`.
- Navigation: `useRouter`, `useLocalSearchParams`.
- Context: none.
- Env vars: through Supabase client.

---

SCREEN NAME: Student Dashboard (`screens/StudentHomeScreen.tsx`)
1️⃣ Purpose
- Primary landing page for authenticated `student` role.
- Provides menu-driven access to notifications, profile/security/settings actions, clubs/events/history.

2️⃣ Navigation Entry Points
- Entered after login/OTP role resolution for student.
- Entered via global auth hydration redirect (`AuthContext` route mapping).
- Route can also be manually opened; guarded by role check.

3️⃣ UI Blocks

Block Name: Role Guard + Early Return
- Visual purpose: prevent unauthorized rendering.
- Hooks: `useEffect` watching `loading`, `user`.
- Logic:
  - if loading: wait.
  - if no user or role != student: `router.replace('/login')`.
  - render `null` while loading/unauthorized.
- Backend Interaction: none directly (context already sourced session).
- Security Notes: client-side role guard, secondary to backend/RLS.

Block Name: Header Icons
- Visual purpose: notifications and settings access.
- UI elements: notification bell icon button, settings icon button.
- State: `showMenu` toggle.
- Actions:
  - notifications button -> `/notifications`.
  - settings button toggles dropdown menu visibility.

Block Name: Settings Dropdown Menu (Toggle)
- Visual purpose: quick account actions.
- UI elements: menu items for Edit Profile, Change Password, Calendar, Theme Toggle, Logout.
- State: `showMenu`; theme toggle via `isDark`/`setIsDark`.
- Hooks: theme context + local state.
- Loading/Error: none.
- User Interaction Flow:
  - each menu item routes and closes menu (except dark mode toggles theme only).
  - Logout calls `supabase.auth.signOut()` then route `/login`.
- Backend Interaction:
  - `supabase.auth.signOut()` only for logout.
- Security/Session Notes:
  - signOut destroys session; AuthContext listener also processes SIGNED_OUT.

Block Name: Primary Action Buttons
- Visual purpose: student features entry points.
- Buttons:
  - View Clubs -> `/clubs`
  - Events -> `/student/events`
  - Attendance History -> `/attendance-history`

4️⃣ Business Logic Extracted
- Role guard (`student` only) and null-render fallback.
- Logout must call Supabase signOut before redirect.
- Theme toggle action in menu should remain non-backend local state only.

5️⃣ Draftbit Rebuild Requirements
- Components:
  - Header icon buttons (notifications/settings).
  - Conditional dropdown panel with menu rows.
  - Action buttons for Clubs/Events/Attendance History.
- Required actions:
  - Route pushes exactly to current paths.
  - Logout service call + redirect.
  - Theme mode toggle updates theme context state.
- Loading/Error:
  - if auth loading or role mismatch, do not render dashboard UI.

6️⃣ Dependencies
- Services: `supabase` for logout.
- Context: `useAuth`, `useTheme`.
- Navigation: `useRouter`.
- Env vars: none direct.

---

SCREEN NAME: Admin Dashboard (implemented in `screens/FacultyHomeScreen.tsx` for `admin` and `faculty`)
1️⃣ Purpose
- Shared management dashboard for `faculty` and `admin` roles.
- Admin users are routed here by auth role mapper.

2️⃣ Navigation Entry Points
- `AuthContext.getRouteForRole('admin'|'faculty') => '/faculty-home'`.
- Faculty login success routes here.
- Guard condition inside screen: role must be faculty OR admin.

3️⃣ UI Blocks

Block Name: Role Guard
- Hook: `useEffect` checks `user.role`.
- Condition:
  - if not faculty/admin -> redirect login.
  - return null when loading/unauthorized.

Block Name: Header + Dropdown Toggle
- Same interaction pattern as student dashboard.
- Notification icon routes `/notifications`.
- Settings menu toggled by `showMenu`.

Block Name: Settings Dropdown (Toggle)
- Menu actions: Edit Profile, Change Password, Calendar, Dark/Light mode toggle, Logout.
- Logout backend call: `supabase.auth.signOut()` then login redirect.

Block Name: Management Actions
- Buttons:
  - Manage Clubs -> `/clubs`
  - Manage Events -> `/event-management`
  - Attendance History -> `/attendance-history`

Backend Interaction
- Direct backend call only on logout.

Security/Session Notes
- Uses role-based client guard for faculty/admin.
- Feature permissions within downstream screens rely on services + RLS.

Edge Cases
- Invalid local role state causes forced redirect to `/login`.

4️⃣ Business Logic Extracted
- Must preserve dual-role access (faculty + admin).
- Must preserve admin routing into same dashboard endpoint.

5️⃣ Draftbit Rebuild Requirements
- Same as Faculty dashboard visual, with role-agnostic title text if desired but preserve route and role checks.
- Ensure buttons map to existing route paths.
- Preserve logout and theme toggle actions.

6️⃣ Dependencies
- Services: `supabase`.
- Context: `useAuth`, `useTheme`.
- Navigation: `useRouter`.

---

SCREEN NAME: President Dashboard (`screens/PresidentHomeScreen.tsx`)
1️⃣ Purpose
- Landing page for president role; includes all management actions plus president transfer feature.

2️⃣ Navigation Entry Points
- Entered from login/OTP/auth hydration when role resolves to president.
- Guarded locally: only role `president` allowed.

3️⃣ UI Blocks

Block Name: Role Guard
- `useEffect` redirects to login when not president.
- Null render during loading/unauthorized.

Block Name: Header + Settings Toggle
- Notification icon to `/notifications`.
- Settings icon toggles menu.

Block Name: Settings Dropdown
- Items: Edit Profile, Change Password, Calendar, Theme toggle, Logout.
- Logout: `supabase.auth.signOut()` then login redirect.

Block Name: President Actions
- Buttons:
  - Manage Clubs -> `/clubs`
  - Manage Events -> `/event-management`
  - Attendance History -> `/attendance-history`
  - Change President -> `/change-president`

Backend Interaction
- Direct call only on logout from this screen.

Security/Session Notes
- Role guard must stay strict to president.
- Change President action leads to high-risk ownership transfer flow.

Edge Cases
- Session missing/mismatched role returns to login.

4️⃣ Business Logic Extracted
- President-only route guard.
- Presence of “Change President” route action is mandatory for governance workflow.

5️⃣ Draftbit Rebuild Requirements
- Same dashboard shell as other roles plus extra button for transfer.
- Keep all route actions intact.
- Keep dropdown/toggle interactions.

6️⃣ Dependencies
- Services: `supabase`.
- Context: `useAuth`, `useTheme`.
- Navigation: `useRouter`.

---

## GLOBAL ANALYSIS SECTION

1️⃣ Complete Navigation Flow Map

A. Login → Profile Fetch → Role Redirect
1. App opens at `/` and immediately redirects to `/login`.
2. `AuthProvider` hydrates Supabase session on initial load.
3. If no session: stay on auth routes.
4. If session exists: role resolved from `profiles(role_id, roles(name))` with retry and fallback role lookup via `roles` table.
5. Route mapping:
   - student -> `/student-home`
   - president -> `/president-home`
   - faculty/admin -> `/faculty-home`
6. Manual login screen repeats role resolution after password auth and routes similarly (except student login blocks faculty/admin).

B. OTP → Session Update → Redirect
1. Signup pushes `/verify-otp` with email+metadata.
2. Verify OTP authenticates user session.
3. Screen updates/upserts profile fields (name/usn/email).
4. Screen fetches role and redirects to role-specific home.

C. Password Reset → Token/OTP → Confirm → Update
1. Forgot Password sends OTP using `signInWithOtp(shouldCreateUser:false)` and navigates to reset.
2. Reset page verifies OTP (`verifyOtp type=email`).
3. On success `updateUser(password)`.
4. Sign out and force user back to login.
5. Deep-link callback `/auth-callback?type=recovery` routes to reset only when session is present.

D. Dashboard Branching
- Student dashboard routes to clubs/events/history and account/settings routes.
- Faculty/Admin dashboard routes to manage clubs/events/history.
- President dashboard includes same management routes + transfer president.

2️⃣ Service Layer Documentation

### `services/supabase.ts`
- `supabase` client (singleton).
- Auth config: `AsyncStorage`, `autoRefreshToken:true`, `persistSession:true`, `detectSessionInUrl:false`.
- Used by: virtually all screens/services/context.

### `services/api/errors.ts`
- `normalizeSupabaseError(err)`
  - maps codes (`PGRST116`, `22P02`, `42501`, `23505`) to user-safe messages.
  - fallback generic message.
- Used by attendance/events/notifications/registrations and composer screen.

### `services/assignments.ts`
- `isValidUuid(value)` -> UUID validation.
- `getMyClubs(user?)` -> resolves club assignments based on role and assignment tables.
- `getMyClubIdsForEvents(role)` -> list club IDs for event views; admin returns `['*']`.
- `getMyPrimaryClubId(user)` -> first club shortcut.
- `resolveFacultyClubId(user, preferredClubId?)` -> validates assigned club for event insert.
- Used by: events service, notifications service, calendar grid.

### `services/events.ts`
- `getEventsForStudent(options?)` -> active events (optionally include past).
- `listEventsForClubIds(clubIds, options?)` -> managed events for role clubs.
- `deleteManagedEvent(eventId, clubIds)` -> soft-delete (`status='deleted'`) scoped by club.
- `getEventById(id)` -> event details including QR state.
- `generateEventQr(eventId)` / `enableEventAttendance(eventId)` -> enables QR with generated token.
- `disableEventQr(eventId)` / `disableEventAttendance(eventId)` -> disables QR.
- `createEvent(input)` -> validates dates/times/title, resolves club, inserts active event.
- `insertEventWithDebug(input)` -> alternate debug insert path.
- Used by: event list/detail/management and scanner flows.

### `services/attendance.ts`
- `submitAttendance(eventId)` -> insert attendance row after resolving user and event club.
  - Handles duplicate (`23505`), FK (`23503`), forbidden/RLS (`42501`).
- `markAttendance(eventId)` -> maps submit result to `{success|already|forbidden}`.
- `hasMarkedAttendance(eventId)` -> checks existing attendance row for current student.
- Used by: EventDetailsScreen, QRScannerScreen.

### `services/attendanceHistory.ts`
- `getAttendanceHistoryForClub(clubId)` -> RPC `get_attendance_history_for_club`.
- Used by: AttendanceHistoryScreen.

### `services/registrations.ts`
- `markEventRegisteredLocal(eventId)` -> AsyncStorage cache flag per user/event.
- `isEventRegisteredLocally(eventId)` -> local registration hint.
- `getMyRegistration(eventId)` -> fetch event registration for current user.
- `registerForEvent(eventId, usn, email)` -> insert registration with duplicate handling.
- Used by: EventRegistrationModal, EventDetailsScreen.

### `services/notifications.ts`
- `getNotificationClubOptions(role, userId)` -> selectable clubs by role.
- `sendNotification({ clubId,title,body,role })` -> inserts notification with role club authorization.
- `getNotificationCountForClubToday(clubId)` -> daily count.
- `getVisibleNotifications(role, userId)` -> role-filtered today feed.
- `deleteNotification(notificationId)` -> delete attempt with structured result.
- Used by: notification inbox/composer, badges.

### `services/permissions.ts`
- `canManageClub(clubId)` -> checks admin/faculty/president assignment permissions.
- `getMyManagedClubIds()` -> union of manageable club IDs by role.
- Used by: club profile, event management/detail.

### `services/clubLogo.ts`
- `getClubLogoPublicUrl(pathOrUrl?)` -> normalizes storage path to public URL.
- Used by: ClubCard, ClubProfileScreen.

3️⃣ Authentication Lifecycle

- Session storage:
  - Persisted in AsyncStorage via Supabase client config.
- Session restore:
  - `AuthProvider.hydrateSession('INITIAL_LOAD')` reads `auth.getSession()`.
  - Resolves profile role with retry delays `[300,600,900]ms`.
- Auth event handling:
  - `onAuthStateChange` listens to `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`.
  - Duplicate event dedupe prevents routing loops.
- Token refresh:
  - Supabase auto-refresh enabled.
  - On `TOKEN_REFRESHED`, hydration reruns role/session route sync.
- Invalid refresh token handling:
  - detects error message patterns and does local sign-out (`scope:'local'`).
- Logout behavior:
  - dashboards call `supabase.auth.signOut()` then route login.
  - Auth listener also nulls user on SIGNED_OUT.

4️⃣ Role-Based System

- Role source of truth:
  - `profiles.roles(name)` join first; fallback `profiles.role_id -> roles.name`.
- Redirect determination:
  - central mapper in AuthContext: faculty/admin => `/faculty-home`; president => `/president-home`; else student.
- Screen-level checks:
  - student dashboard requires role student.
  - faculty dashboard accepts faculty/admin.
  - president dashboard requires president.
  - change-president requires president.
  - login/faculty-login enforce portal-specific role constraints.

5️⃣ RLS Dependency Mapping

If RLS/policies fail or are too restrictive, these break:
- Login/role routing: profile role queries fail -> unable to determine role/sign-out fallback.
- OTP profile finalize: profile update/upsert fails -> signup completion blocked.
- Event registration: inserts/selects on `event_registrations` fail.
- Attendance marking: `attendance` insert may return `42501` and block check-in.
- Notification visibility/send/delete: notification table policies directly gate behavior.
- Club management screens: assignment/policy lookups (`faculty_assignments`, `president_assignments`, `clubs`) can return empty and disable functionality.
- President transfer: RPC `transfer_president_by_email` policy/permission failure aborts ownership transfer.
- Attendance history: RPC access failure returns empty list.

6️⃣ High-Risk Functional Areas (Do Not Break)

- Login loop logic
  - AuthContext dedupe + hydration + session key routing prevents repeated redirects.
  - Student/faculty portal separation sign-outs are critical.

- OTP verification
  - verifyOtp type fallback (`email` then `signup`) is essential compatibility branch.
  - profile update -> retry -> upsert fallback is essential to avoid partial signup state.

- Password reset redirect
  - forgot-password OTP issuance and reset page email-context dependency.
  - auth-callback recovery logic only redirects when recovery session exists.

- President role transfer
  - Requires current president assignment lookup + RPC `transfer_president_by_email` with strict confirm payload.
  - forced sign-out after successful transfer required.

- Supabase session handling
  - Persisted sessions, token refresh handling, invalid refresh-token cleanup.
  - SIGNED_OUT and duplicate SIGNED_IN event handling safeguards.

---

## Shared Components, Modals, Toggles, and Validation Inventory

### Shared components used by analyzed flows
- `ClubCard`, `ClubSearchBar`, `ClubSearchEmptyState` (club listing).
- `EventCreationModal` (event creation form modal with date/time/location validation).
- `EventRegistrationModal` (event registration modal with USN/email and registration service integration).
- `CalendarGrid` / `CalendarDay` (calendar + per-day modal event list).
- `ClubGallery` (modal full-screen image viewer + upload/delete).
- `ClubFilesSection` (file upload/download/delete logic and validations).
- `EditableTextSection`, `ClubLogo`, `AttendanceList`, `AttendanceStudentList`, `EventList`, `NotificationCard`, etc.

### Modals explicitly present
- Event details attendance modal (`screens/EventDetailsScreen.tsx`).
- Event registration modal (`components/EventRegistrationModal.tsx`, mounted by EventDetails).
- Event creation modal (`components/EventCreationModal.tsx`).
- Calendar day event modal (`components/CalendarDay.tsx`).
- Club gallery image fullscreen modal (`components/ClubGallery.tsx`).

### Toggles explicitly present
- Password visibility toggles (Login, FacultyLogin, ResetPassword, ChangePassword).
- Theme dark/light toggle in all dashboards settings dropdown.
- Settings dropdown visibility toggles (`showMenu`) in all dashboards.

### Input validation patterns recurring across app
- Email regex checks in login/signup/forgot/faculty/change-president.
- OTP numeric sanitize + strict length 6.
- Password minimum length and confirmation matching.
- Signup password complexity (uppercase + number).
- Event modal validation: required title/date/time/location, ISO-like date format, HH:MM format, end>start.
- Change-president confirmation text must equal `YES` (UI) and RPC confirm argument fixed as `TRANSFER PRESIDENT`.

### useEffect flow inventory (critical)
- `context/AuthContext.tsx`:
  - initial hydrate + auth listener registration/cleanup.
- `app/_layout.tsx`:
  - deep-link initial URL logging + URL event listener.
- Dashboard screens:
  - role guard redirects.
- `app/auth-callback.tsx`:
  - resolves callback type and recovery routing.
- Operational screens (outside requested 8 but relevant):
  - events, notifications, attendance history, QR scanner/details use effects for data fetch and guard behaviors.

---

## FINAL CHECKLIST FOR UI REDESIGN SAFETY

### Authentication + Entry
- [ ] `/` still redirects to `/login`.
- [ ] Login validates required/email and calls password auth.
- [ ] Student login blocks faculty/admin and signs out locally.
- [ ] Faculty login blocks student/president and signs out locally.
- [ ] Signup validates USN/email/password rules exactly.
- [ ] Signup sends metadata and routes to OTP with params.

### OTP + Profile Finalization
- [ ] OTP input sanitized to 6 digits.
- [ ] verifyOtp fallback between `email` and `signup` types remains.
- [ ] On OTP success, profile update + retry + upsert remains.
- [ ] Post-OTP role fetch and redirect mapping remains intact.
- [ ] Resend OTP fallback logic remains intact.

### Password Recovery
- [ ] Forgot password uses `signInWithOtp(...shouldCreateUser:false)`.
- [ ] Reset verifies OTP before password update.
- [ ] Reset signs out after password change and routes login.
- [ ] Auth callback recovery still routes only when session exists.

### Role Dashboards + Navigation
- [ ] Student/faculty(admin)/president role guards remain.
- [ ] Dashboard menu routes unchanged.
- [ ] Theme toggle behavior preserved.
- [ ] Logout always triggers `supabase.auth.signOut()`.
- [ ] President dashboard retains Change President entry.

### Backend/RLS Dependencies
- [ ] No service function signatures changed.
- [ ] No Supabase table names/RPC names changed.
- [ ] No auth context session lifecycle changes.
- [ ] No role resolution query shape changes.
- [ ] No assignment/permission check sequence changes.

### High-Risk Governance and Attendance
- [ ] President transfer RPC contract unchanged.
- [ ] Attendance insert and forbidden handling (`42501`) unchanged.
- [ ] Registration duplicate handling unchanged.
- [ ] Notification permission scoping unchanged.

