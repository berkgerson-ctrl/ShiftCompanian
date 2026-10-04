# Architecture

## Overview

A static site (no build step, no framework). Everything runs in the browser:

```
UI + rules engine  (js/app.js)
      │ every change
      ▼
IndexedDB  ←─ source of truth, works offline
      ▲ │
      │ │ dirty records / newer remote records
      │ ▼
Sync  (js/sync.js)  ⇄  Firestore  users/{uid}/…       (optional)
Export / Apps Script push                              (optional)
```

`js/app.js` is a classic script (inline `onclick` handlers call its functions). `js/sync.js` is an ES module that talks to it only through `window.syncApi` and listens for a `localchange` event, so the app works unchanged when sync is absent.

## Time and dates

- All durations and balances are **integer minutes**. A standard day is `STD = 468` (7h 48m). Hours are only for display.
- Dates are stored as an integer **day number**: days since 1970-01-01 in UTC. This avoids time-zone and daylight-saving drift. `dow(n)` gives the weekday, `iso(n)` the `YYYY-MM-DD` form.
- Times are `"HH:MM"` strings, 24-hour.

## Data model (IndexedDB `shiftapp`, version 2)

| Store | Key | Fields |
|---|---|---|
| `shifts` | `d` (day number) | `s` start, `e` end, `st` status, `f` note, `u` edit time (ms), `dirty` (1 = not yet synced), `del` (tombstone) |
| `leaves` | `id` | `d`, `type` (PTO/TOIL/Sick), `full` (bool), `s`, `e` (partial only), `st`, `u`, `dirty`, `del` |
| `holidays` | `d` (day number) | `name`, `u`, `dirty`, `del` |
| `swaps` | `id` | `give`, `take` (day numbers, 0 = none), `who`, `st`, `fu` (follow-up day, 0 = none), `note`, `u`, `dirty`, `del` |
| `meta` | `k` | `rules`: `v` = limits; `balances`: `v` = opening minutes per type; `seeded` flag. Rules and balances also carry `u`, `dirty`. |

Statuses: `Scheduled`, `Planned`, `Review` (shown as *Under Review*), `Approved`, `Denied`. Shifts use the first four: the company sets the schedule, so a shift cannot be Denied. `Denied` applies to leave and swap requests.

`leaves.id` is `Date.now()*1000 + random`, unique across devices, so two devices never create colliding ids.

One shift per day is a deliberate simplification: the day number is the key.

## Rules engine (`check(d)`)

Checking whether day `d` can be worked, on top of the existing schedule:

- Workdays are shifts that are not covered by an **Approved full-day leave**. (Under Review leave still counts as a workday, because if it is denied you will be working.) Partial leave never removes a day.
- **Weekly:** weeks run **Sunday to Saturday**. Error if the week would exceed *Max workdays / week*.
- **Consecutive:** counts the unbroken run of workdays through `d`. Error beyond *Max consecutive days*.
- **Six-day weeks per month:** a week with 6 or more workdays is a "six-day week". It counts toward the month containing its **Saturday**, so a week split across two months is counted once. Error if adding `d` creates more than *6-day weeks / month*.

Checks warn rather than block: the shift form offers *Save anyway*.

## Bank holidays and TOIL

Bank holidays are a user-entered list (Rules tab). Whether a holiday earns TOIL is **derived**, never stored, so it is identical on every device:

| State | Condition | TOIL |
|---|---|---|
| `off` | no shift that day | none |
| `blocked` | a shift exists **and** a **full-day** leave request of any type (PTO, TOIL or Sick) exists that day with status Under Review or Approved | none |
| `pending` | shift exists, no such PTO, day is in the future | none yet |
| `earned` | shift exists, no such PTO, day is today or earlier | `TOIL_DAY` = 468 min |

Denied requests and partial leave do not block. `bal('TOIL') = opening balance + 468 × earned holidays`. Because it is derived, editing the schedule or leave later (for example denying the PTO) immediately recomputes it. Enter your opening TOIL balance without any holiday TOIL that the list will add.

The leave form warns before you submit a full-day leave request on a holiday you are scheduled to work.

## Swap log

A record, not an engine: it never edits shifts. When a swap is created or its dates change, the *take* day is checked with `check(take, give)`, where `give` is excluded from the schedule so a same-week swap is not double counted. The result is a warning with *Save anyway*. `fu` (follow-up) drives the follow-up list on the Swaps tab and a 09:00 reminder.

## Reminders

See [NOTIFICATIONS.md](NOTIFICATIONS.md). Reminder settings live in `localStorage` on each device (permission is per device) and are not synced.

## Leave balances

`remaining(type) = opening balance (+ earned bank holiday TOIL for TOIL) − Σ duration of Approved requests of that type`. A full day is 468 minutes; a partial is `end − start`, capped at 468. Opening balances are edited on the Rules tab. TOIL is not accrued automatically.

## Sync

Firestore layout, per signed-in user:

```
users/{uid}/shifts/{d}      users/{uid}/leaves/{id}      users/{uid}/settings/{rules|balances}
users/{uid}/holidays/{d}    users/{uid}/swaps/{id}
```

Each document is the local record plus `s`, a **server timestamp** set on write.

`run()` in `js/sync.js`:

1. **Pull.** For each collection, query `s >= cursor` (cursor stored per user in `localStorage`). Each remote record is handed to `syncApi.apply`, which writes it only if its `u` is **newer than** the local copy's `u`; otherwise it is ignored.
2. **Push.** All records still flagged `dirty` (those that survived step 1) are written in batches of ≤400 with `s = serverTimestamp()`.
3. **Clean.** The dirty flag is cleared only if the record was not edited again in the meantime (`u` unchanged).
4. Move the cursor to the largest `s` seen.

Runs happen after sign-in, 1.5 s after any local change, when the device comes back online, when the app regains focus, and on *Sync now*.

**Conflict policy:** last-write-wins **per record**, using the client edit time `u`. Two devices editing the *same* shift offline: the later edit wins entirely; the other edit is discarded. Edits to *different* records always merge. This was chosen over per-field merge because records are tiny and a half-merged shift (start from one device, end from another) is worse than a clean winner.

**Deletes** are tombstones (`del: true`) so a deletion on one device cannot be undone by another device that still has the old copy.

**Known weaknesses**
- It trusts device clocks. A phone with a badly wrong clock can win conflicts it should lose.
- Tombstones are never purged (they are tiny).
- No end-to-end encryption: data is protected by Firebase Auth and security rules, and Google can technically read Firestore contents.

## Security rules

`firestore.rules`: a signed-in user may read and write only `users/{their own uid}/**`; everything else is denied.

## Offline and updates

`sw.js` precaches the shell and serves it cache-first with background refresh. Firebase SDK modules from `gstatic.com` are cached the same way after the first online load. Firestore and Auth network calls are never cached. Bump `VERSION` in `sw.js` on every release.

## Tests

`tests/sync.test.mjs` loads the real `js/app.js` and `js/sync.js` against a simulated IndexedDB and Firestore and drives several virtual devices through the scenarios in the README, including the v1 to v2 database upgrade, the TOIL rules and the reminder and calendar-file logic. It does not test the screens or live Firebase; those were checked by hand in a browser.
