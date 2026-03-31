

## Plan: Make Landing Page the Default for Logged-Out Users

**Change:** Update routing in `src/App.tsx` so that `/` shows the Landing page for logged-out users and the dashboard for logged-in users, removing the separate `/welcome` route.

### Implementation

**File: `src/App.tsx`**
- Change the `/` route to render `<Landing />` for unauthenticated users and `<Index />` for authenticated users (using a conditional wrapper component)
- Remove the `/welcome` route
- Update `PublicRoute` or create a new `HomeRoute` component that checks auth state and renders accordingly

The logic:
- If user is logged in → show `<Index />` (dashboard)
- If user is logged out → show `<Landing />` (landing page)
- `/auth` route remains unchanged

