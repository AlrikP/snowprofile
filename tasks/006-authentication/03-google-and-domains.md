# 006.3: Google sign-in and login domains

Status: todo
Depends on: task 006.2 (`DEMO_MODE` handling)

## Acceptance criteria

- [ ] Google sign-in is enabled when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
      are set and `DEMO_MODE` is off; both are in `.env.example`.
- [ ] `ALLOWED_LOGIN_DOMAINS` restricts sign-in to the listed email domains; unset allows
      all.
- [ ] The app refuses to start with both `DEMO_MODE` and `ALLOWED_LOGIN_DOMAINS` set; a
      test checks it.
- [ ] A user who signs in without a membership sees a "no access" page, not another
      organization's data.
- [ ] How to register the Google OAuth client and its callback URL is in the README or a
      deployment doc.
