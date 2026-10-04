# Changelog

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
