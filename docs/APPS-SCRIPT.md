# Push your schedule to a Google Sheet

Optional. The app can send your shifts, leave and balances to a sheet in **your** Google account through a small Apps Script that you own. No Google sign-in is needed inside the app; a shared secret protects the endpoint.

If you only want occasional copies, skip this: **Rules → Export for payroll → Copy**, then paste into cell A1 of any sheet.

## Set up

1. Create a Google Sheet.
2. **Extensions → Apps Script**. Delete the sample code and paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs).
3. Change `SECRET` to a long random string (a password manager can generate one). Keep `SHEET_NAME` or rename it; the script creates the tab if it is missing.
4. **Deploy → New deployment → Select type: Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Authorize when prompted, then copy the **Web app URL** (ends in `/exec`).
6. In the app: **Rules → Push to a Google Sheet.** Paste the URL and the secret, then **Save & push now**. You should see `Sheet updated: N rows.`

The URL and secret are stored on that device only (browser local storage) and are never synced to Firebase.

## What gets written

The tab is cleared and rewritten on every push, so it always mirrors the app:

`Date | Weekday | Kind | Leave type | Start | End | Minutes | Status | Note`, then your remaining balances in minutes. Google Sheets may reformat dates and times as it would when you type them; that is cosmetic.

## Security notes

- "Anyone" means anyone with the URL can *call* the script, but without the secret it returns `Wrong secret` and writes nothing. Treat the secret like a password and do not commit it.
- To revoke access: change `SECRET` in the script and redeploy (**Deploy → Manage deployments → Edit → New version**), or delete the deployment.
- After editing the script you must deploy a **new version** for changes to take effect.

## Troubleshooting

| Message | Fix |
|---|---|
| `Could not confirm…` | Offline, wrong URL, or access is not set to Anyone. Open the URL in a browser: you should see an error page from the script, not a Google sign-in. |
| `Rejected: Wrong secret` | The secret in the app differs from `SECRET` in the script. |
| Nothing changes after editing the script | Create a new deployment version. |
