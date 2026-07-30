# Task Checklist — Login Page & Auth Flow

- [x] Create `AuthProvider.tsx` context with `useAuth` hook in `src/components/auth/AuthProvider.tsx`
- [x] Wrap root layout in `AuthProvider` in `src/app/layout.tsx`
- [x] Create `/login` page at `src/app/login/page.tsx`
- [x] Update root page `/` in `src/app/page.tsx` with landing UI & redirect to `/login`
- [x] Update `DashboardLayout` in `src/app/(dashboard)/layout.tsx` with auth guard check & loading spinner
- [x] Update `TopBar.tsx` to display user info and wire Sign Out button
- [x] Run `npm run lint` and `npm run build` to verify zero errors
- [x] Update `LOG.md` and `ROADMAP.md` with session progress
