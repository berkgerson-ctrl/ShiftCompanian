# Shift Companion

An offline-first Progressive Web App for people with irregular shifts. It keeps your schedule, leave and TOIL balances on your own device, checks any change against **your** personal limits, and (optionally) backs everything up to your own Firebase project.

No app store, no AI, no accounts to run: open the page, add it to your home screen, and it works with no signal.

**Live app:** https://berkgerson-ctrl.github.io/ShiftCompanian/

## Features

| Area | What it does |
|---|---|
| **Schedule** | Month calendar (weeks run Sunday to Saturday), colour-coded status dots, a draggable day sheet, add / edit / delete shifts, a "Leave by" reminder from your commute time. |
| **Import** | Excel (`.xlsx`) or CSV with columns `Date, Start Time, End Time, Status`. The Import sheet has **Excel template** and **CSV template** buttons: download, fill in, import. Preview first; clashes with existing shifts ask *Keep existing* or *Replace*. A sample CSV is in [`docs/import-template.csv`](docs/import-template.csv). |
| **Leave & TOIL** | PTO, TOIL and Sick balances to the minute (1 day = 7h 48m = 468 min). Request full or partial days with start and end time; only **Approved** requests deduct. Leave shows under the shift in the day sheet. TOIL earned on bank holidays is added automatically. |
| **Rules** | Max workdays per week, max consecutive days, max six-day weeks per month, commute time. Checked when you add a shift, import, or test a swap day. Approved full-day leave does not count as a workday. |
| **Swaps** | Swaps are arranged outside the app; the app is your record and reminder. **Check a day** tells you whether a date is safe for your rules. **Swap log** records what you give and take, with whom, a status, a note and an optional follow-up date, checks the days against your rules when you log it, and shows the swap in the day sheet. The log does not change your schedule. |
| **Bank holidays** | Rules tab. Add your region's dates (one by one or pasted as a list). Scheduled to work one: you earn **1 TOIL day** (7h 48m) once the day arrives. Take a **full day of leave** on it (PTO, TOIL or sick; under review or approved) and you earn none. **Partial** leave and denied requests do not cancel it. |
| **Reminders** | A "Leave by" notification before you need to leave for each shift, plus swap follow-up reminders. Works while the app is open or running; a downloadable calendar file gives alarms that fire even when it is closed. See [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md). |
| **Backup** | Cloud sync across devices (Firebase), plus a one-tap payroll export you can paste into Google Sheets, or push to a sheet with Apps Script. |

Shift statuses: **Scheduled, Planned, Under Review, Approved.** Leave and swap requests can also be **Denied**; shifts cannot, because the company decides the schedule.

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
3. Push to `main`. The workflow in `.github/workflows/pages.yml` runs the tests and publishes the site at `https://berkgerson-ctrl.github.io/ShiftCompanian/`.
4. Open that URL on your phone and install it (Android Chrome: *Install app*; iPhone Safari: *Share → Add to Home Screen*).

The app already works fully offline at this point. For cloud sync and Sheets push, follow **[docs/SETUP.md](docs/SETUP.md)**.

## Documentation

- [docs/SETUP.md](docs/SETUP.md): GitHub Pages, Firebase (sign-in, database, security rules) and releasing updates.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): data model, rule logic, time maths and the sync algorithm.
- [docs/APPS-SCRIPT.md](docs/APPS-SCRIPT.md): pushing your schedule into a Google Sheet.
- [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md): how reminders work, their limits, and the calendar file.
- [CHANGELOG.md](CHANGELOG.md): what changed in each release.

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
CHANGELOG.md            release notes
tests/sync.test.mjs     two-device sync test (simulated Firestore)
.github/workflows/      test + deploy to GitHub Pages
```

## Tests

```bash
npm test      # or: node tests/sync.test.mjs
```

Runs 30 checks against a simulated Firestore and IndexedDB: sync (push/pull, newest-edit-wins conflicts, deletes, offline edits on two devices, restore on a new device, account isolation, holidays and swaps), the upgrade from the first database version, the bank holiday TOIL rules, reminder timing, the calendar file and the import templates. No dependencies.

## Privacy

Your schedule lives in your browser's IndexedDB. If you enable sync it is also stored in **your own** Firebase project, readable only by your Google account (see `firestore.rules`). There is no analytics and no third-party server. The Firebase settings in `js/firebase-config.js` are public identifiers, not secrets; it is fine for the repo to be public. Do not commit exported schedules.

## Known limitations

- One shift per day; shifts cannot cross midnight yet.
- Conflicts resolve per record (newest edit wins), not per field. Device clocks should be roughly correct.
- TOIL accrues only from bank holidays you work. Other overtime is added by editing the opening TOIL balance.
- Reminders cannot fire while the app is fully closed (a limit of web apps without a server). The calendar file covers that case; true push needs a server, see [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md).
- The swap log is a record: approving a swap does not move shifts in your schedule.
- The Firebase sync and Apps Script push were written against the documented APIs and exercised with simulations, not against live Google services. Test them once with your own project (see SETUP).

## Licence

MIT, see [LICENSE](LICENSE). SheetJS is bundled under its own Apache-2.0 licence ([js/vendor/xlsx.LICENSE.txt](js/vendor/xlsx.LICENSE.txt)).
