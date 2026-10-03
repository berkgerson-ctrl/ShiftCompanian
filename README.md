# Shift Companion

An offline-first Progressive Web App for people with irregular shifts. It keeps your schedule, leave and TOIL balances on your own device, checks any change against **your** personal limits, and (optionally) backs everything up to your own Firebase project.

No app store, no AI, no accounts to run: open the page, add it to your home screen, and it works with no signal.

## Features

| Area | What it does |
|---|---|
| **Schedule** | Month calendar (weeks run Sunday to Saturday), colour-coded status dots, a draggable day sheet, add / edit / delete shifts, a "Leave by" reminder from your commute time. |
| **Import** | Excel (`.xlsx`) or CSV with columns `Date, Start Time, End Time, Status`. Preview first; clashes with existing shifts ask *Keep existing* or *Replace*. Template: [`docs/import-template.csv`](docs/import-template.csv). |
| **Leave & TOIL** | PTO, TOIL and Sick balances to the minute (1 day = 7h 48m = 468 min). Request full or partial days with start and end time; only **Approved** requests deduct. Leave shows under the shift in the day sheet. |
| **Rules** | Max workdays per week, max consecutive days, max six-day weeks per month, commute time. Checked when you add a shift, import, or test a swap day. Approved full-day leave does not count as a workday. |
| **Swaps** | No marketplace: swaps are arranged outside the app. Type a date your peer offers or asks for and see whether it is safe for your rules. |
| **Backup** | Cloud sync across devices (Firebase), plus a one-tap payroll export you can paste into Google Sheets, or push to a sheet with Apps Script. |

Statuses: **Scheduled, Planned, Under Review, Approved, Denied.**

## Quick start (try it locally)

```bash
git clone <your-repo-url> && cd shift-companion
python3 -m http.server 8080      # or: npm start
# open http://localhost:8080
```

On first run the app is empty. **Rules tab → Load demo data** fills it with a sample month. Service workers need `localhost` or HTTPS, so opening `index.html` straight from disk will run but will not install or work offline.

## Publish it (about 10 minutes)

1. Create a GitHub repository and upload everything in this folder (keep the `.github` folder).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/pages.yml` runs the tests and publishes the site at `https://<you>.github.io/<repo>/`.
4. Open that URL on your phone and install it (Android Chrome: *Install app*; iPhone Safari: *Share → Add to Home Screen*).

The app already works fully offline at this point. For cloud sync and Sheets push, follow **[docs/SETUP.md](docs/SETUP.md)**.

## Documentation

- [docs/SETUP.md](docs/SETUP.md): GitHub Pages, Firebase (sign-in, database, security rules) and releasing updates.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): data model, rule logic, time maths and the sync algorithm.
- [docs/APPS-SCRIPT.md](docs/APPS-SCRIPT.md): pushing your schedule into a Google Sheet.

## Project layout

```
index.html              page shell
manifest.webmanifest    install metadata
sw.js                   service worker (offline shell)
css/styles.css          styles
js/app.js               UI, rules engine, IndexedDB storage, import/export
js/sync.js              Firebase sign-in and Firestore sync
js/firebase-config.js   YOUR Firebase settings (edit this)
js/vendor/              SheetJS (xlsx) for Excel import, Apache-2.0
icons/                  app icons
firestore.rules         security rules: each user reads/writes only their own data
docs/                   documentation, import template, Apps Script receiver
tests/sync.test.mjs     two-device sync test (simulated Firestore)
.github/workflows/      test + deploy to GitHub Pages
```

## Tests

```bash
npm test      # or: node tests/sync.test.mjs
```

Runs 11 checks of the sync logic against a simulated Firestore and IndexedDB: push/pull, newest-edit-wins conflicts, deletes, offline edits on two devices, restore on a new device, and account isolation. No dependencies.

## Privacy

Your schedule lives in your browser's IndexedDB. If you enable sync it is also stored in **your own** Firebase project, readable only by your Google account (see `firestore.rules`). There is no analytics and no third-party server. The Firebase settings in `js/firebase-config.js` are public identifiers, not secrets; it is fine for the repo to be public. Do not commit exported schedules.

## Known limitations

- One shift per day; shifts cannot cross midnight yet.
- Conflicts resolve per record (newest edit wins), not per field. Device clocks should be roughly correct.
- TOIL is a balance you adjust yourself; there is no overtime accrual.
- The "Leave by" reminder is a label on the shift, not a push notification.
- The swap log (recording who/when) is not built yet.
- The Firebase sync and Apps Script push were written against the documented APIs and exercised with simulations, not against live Google services. Test them once with your own project (see SETUP).

## Licence

MIT, see [LICENSE](LICENSE). SheetJS is bundled under its own Apache-2.0 licence ([js/vendor/xlsx.LICENSE.txt](js/vendor/xlsx.LICENSE.txt)).
