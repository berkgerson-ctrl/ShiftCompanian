# Changelog

## 1.5.0

- **Extra time (ET).** Add "Extra time after shift" to any shift and choose how it is reimbursed: *Time* (added to a new **ET** balance) or *Money* (paid, tracked for payroll). ET is also a leave type, so approved ET requests are deducted from the balance. ET counts once its day arrives. Opening ET balance is on Rules.
- **Overtime (OT).** A voluntary extra day: status *Overtime (extra day)*, pink, labelled OT. It must pass the same rule checks (week, days in a row, six-day weeks), counts toward those limits, but is kept out of regular scheduled hours and the shift mix. Statistics has an *Overtime & extra time* row. An overtime day on a bank holiday earns no company TOIL day.
- **Check swap / Check OT** buttons on every day off. Swap lets you pick the shift you would give away; "Log this swap" pre-fills the swap form. "Add as overtime" opens the shift form with Overtime selected.
- **Colour coding in the normal calendar**, the same as the expanded one (E/L/C tints, OFF dimmed, leave fills, OT pink), with a legend. Small orange dot = day has extra time.
- Payroll export has Overtime and Extra time rows. Import accepts "Overtime" as a status.
- Service worker cache `sc-v11`. Tests: 55 checks.

## 1.4.4

- Manifest now has its own unique `id` (`shift-companion-app`) so Chrome on Android no longer mistakes the app for one already installed from the same github.io site. Service worker cache `sc-v9`.

## 1.4.3

- **Fixed: signing in with Google broke the app (Schedule tab dead, days not tappable, blank screen after refresh).** The cloud sync stored its server timestamp in a field named `s`, the same name a shift uses for its start time (and a partial leave for its start). Every sync replaced start times with a timestamp, and the app crashed when it met a shift with no start time. The timestamp now lives in `sv`.
- **Self-repair.** On the first sync after updating, a device re-sends all of its complete records so the cloud gets its start times back. Records that lost their start time are ignored (never crash the app, never uploaded). A device that only has damaged copies will receive the good ones from the device that still has them.
- A screen that fails to draw now shows the recovery screen (Reload, Repair, Backup) instead of freezing silently.
- Service worker cache `sc-v8`. Tests: 44 checks, including start-time round trips and recovery from damaged data.

## 1.4.2

- **Sync no longer throws you to the top of the page.** Background redraws (sync status, incoming data) now keep your scroll position, wait until your finger is off the screen, and are combined into one. Before, tapping *Sync now* on the Rules page jumped back to the top, which on Android Opera/Chrome could trigger pull-to-refresh and reload the app mid-sync.
- **Pull-to-refresh is switched off inside the app** (the browser menu still reloads).
- **Start-up splash** ("Loading...") replaces the empty navy screen while saved data loads. Nothing draws before your data has loaded, and the recovery screen can no longer be overwritten by a background redraw.
- Service worker cache `sc-v7`.

## 1.4.1

- **Blank screen on refresh**: the first screen is now protected. If something goes wrong while starting, the app shows a recovery screen (Reload, Repair app files, Download a backup) instead of a blank page. A storage request that never answers can no longer freeze the start-up (8 s limit, then a red warning bar). Old open connections release the database so an update is never blocked.
- **Service worker**: opening the app asks the network first (new releases appear straight away) and falls back to the saved copy offline. Updates are downloaded around the browser's 10-minute HTTP cache so a release is never half old, half new. Only clean responses are saved. A missing optional file no longer aborts the install. Cache `sc-v6`.
- **Install**: Rules has an "Install on this phone" card (real install button when Chrome offers it, otherwise what to do). The manifest now has an explicit `id`, the full name as short name, and separate "any" and "maskable" icons.
- **Backup**: Rules > Data > Download a backup (JSON).

## 1.4.0

- **Custom shift types.** Rules > Shift types: add, edit or delete your own (name, letter, start/end, colour; up to 8). Early and Late remain the defaults. Types sync between devices. The expanded calendar, its legend, the add-shift quick-select buttons and the statistics all use them. Hours that match no type, or a shift with partial leave, still show C (a type cannot use the letter C).
- **Statistics page** (Schedule > Stats, or Rules > Statistics & charts): scheduled hours per month, shift mix, TOIL balance and earned per month, leave taken per type this year, and how much of your six-day-week, workdays-per-week and consecutive-day limits a month uses. Includes a table view of the data.
- **Motion** (CSS only, transform/opacity): spring slide-in and anticipation on close for forms and the day sheet, springy release when you drag the sheet, press-in on calendar days and buttons, the "+" turns into an X while a form is open, form fields rise in sequence, quick-select buttons morph colour and glow, a drawn checkmark after saving a shift/leave/shift type or importing, and tabs slide left or right. Honors the system "reduce motion" setting.
- Service worker cache `sc-v5`. Tests: 37 checks.

## 1.3.0

- Fixed: the "+" add button was drawn behind the bottom navigation on phones. It now sits in front (and stays above the safe-area inset).
- Two default shift types: **Early 08:50-16:38** and **Late 09:22-17:10**. The add-shift form opens on Early and has one-tap Early / Late buttons. The demo data, CSV and Excel templates use these times.
- Dragging the bottom sheet down now **expands the calendar**. Each day shows a letter: **E** early, **L** late, **C** customized (any other times, or a shift with partial leave).
- Expanded calendar colours days: off days are dimmed with an OFF label, full-day leave is filled green (approved) or orange (under review) with the leave type. A legend is shown below the grid.
- Service worker cache bumped to `sc-v4`. Tests: 32 checks.

## 1.2.0

- **Schedule template**: the Import sheet has *Excel template* and *CSV template* buttons. The Excel file has a Schedule sheet (real date and time cells, three example rows) and an Instructions sheet.
- **TOIL rule corrected**: a bank holiday counts as worked whenever you have a shift on it. A **full-day** leave request of **any** type (PTO, TOIL or Sick) that is not Denied cancels the TOIL day. Partial leave does not.
- **Shifts cannot be Denied** (the company decides the schedule). Removed from the shift form; an imported row marked Denied is rejected with a clear message. Denied remains for leave and swap requests.
- Service worker `sc-v3`.

## 1.1.0

- **Bank holidays** (Rules tab): add dates one by one or paste a list. Scheduled to work one and you earn 1 TOIL day (7h 48m) once it arrives; PTO submitted for that day means none. Shown in the day sheet, Leave tab and export.
- **Swap log**: record give/take days, colleague, status, note and follow-up date; rule check on the days; follow-up list; swap shown in the day sheet.
- **Leave-by reminders**: notifications before you need to leave, swap follow-up reminders, a test button, and a calendar (.ics) export with alarms.
- Database upgraded to version 2 (new `holidays` and `swaps` stores); existing data is kept.
- Sync covers holidays and swaps.
- Fixes: negative balances display correctly; "Leave by" label is right for shifts starting before the trip time; "today" updates after midnight.
- Service worker `sc-v2`.

## 1.0.0

First release: schedule, import, leave and TOIL, rules, swap checker, payroll export, Sheets push, Firebase sync, offline PWA.
