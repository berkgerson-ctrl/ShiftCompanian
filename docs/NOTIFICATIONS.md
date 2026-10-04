# Reminders and notifications

## What you get

1. **Leave-by notification.** For each upcoming shift (not on a day of approved full-day leave) you are notified **N minutes before you need to leave**. Leave-by time = shift start − your travel time. Example: shift 07:00, travel 45 min, reminder 10 min: you are told at 06:05 to leave by 06:15.
2. **Swap follow-up.** A notification at 09:00 on a swap's follow-up date while the swap is Planned or Under Review.
3. **Calendar file (.ics).** Your next 60 days of shifts (and open swap follow-ups) as calendar events, each with an alarm at *travel time + reminder* before the shift starts. Your phone's calendar fires these even when the app is closed.

Turn on 1 and 2, set the lead time, send a test, and download the calendar file from **Rules → Reminders**.

## The limit you need to know

A web app can only show a notification when something is running to show it. The app schedules each reminder in the page, so it fires while the app is **open, or running in the background** (an installed app that the phone has not shut down). If the app is fully closed, nothing runs and nothing can fire.

What the app does about that:

- Opening the app inside the reminder window (after the alert time, before the leave-by time) shows the reminder straight away, once.
- The **calendar file** is the closed-app answer. Use it for the days that matter, or all the time.
- Each reminder shows at most once (remembered on the device for 3 days).

Browsers and phones differ. Android Chrome installed apps behave best. iPhone needs the app added to the Home Screen first (iOS 16.4 or later) before it will offer notifications at all.

## Using the calendar file

- **iPhone:** download, open the file from the Files app or the Safari download list, tap *Add All*.
- **Android:** open the downloaded file; it opens in your calendar app.
- Events have fixed IDs, so downloading again after a schedule change **updates** the matching events in most calendar apps. Shifts you deleted or denied stay in the calendar until you remove them.
- Times are "floating" (no time zone), so they follow your phone's local time.

The file was checked for valid structure and alarm values; it has not been tried on every calendar app. If your calendar ignores alarms on imported events, set its default alert for the calendar the events land in.

## True push (not built)

Reliable alerts with the app closed and no calendar need a server to send Web Push. On Firebase that means Cloud Messaging plus a scheduled Cloud Function that reads your shifts and sends the alert at the right minute. It requires moving the Firebase project to the pay-as-you-go (Blaze) plan (there is a free allowance, but a billing card is needed) and is a separate piece of work. Say if you want it.

## Privacy

Reminder settings (on/off, lead time, which reminders were shown) are stored only on the device. Nothing about reminders is sent anywhere.
