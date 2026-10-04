# Setup guide

Three independent parts. Do only what you need: the app is fully usable after Part 1.

1. [Publish on GitHub Pages](#1-publish-on-github-pages)
2. [Cloud sync with Firebase](#2-cloud-sync-with-firebase) (optional)
3. [Releasing updates](#3-releasing-updates)

For pushing to Google Sheets see [APPS-SCRIPT.md](APPS-SCRIPT.md).

---

## 1. Publish on GitHub Pages

**Upload the files**

*Browser:* create a new repository, choose **Add file → Upload files**, drag in the *contents* of the project folder (including the hidden `.github` folder; if your browser skips hidden folders, use the git route), and commit.

*Git:*

```bash
cd shift-companion
git init -b main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/berkgerson-ctrl/ShiftCompanian.git
git push -u origin main
```

**Turn on Pages**

1. Repository **Settings → Pages**.
2. Under *Build and deployment*, set **Source** to **GitHub Actions**.
3. Open the **Actions** tab; the "Test and deploy to GitHub Pages" run should go green (first run can take a minute). Its summary shows your URL, normally `https://berkgerson-ctrl.github.io/ShiftCompanian/`.

If the run fails at *Run sync tests*, open the log: the failing check names what broke.

**Install on your phone**

- Android (Chrome): menu → *Install app*.
- iPhone (Safari): *Share → Add to Home Screen*.

Check offline mode once: open the app, switch on airplane mode, reopen it. It should load and let you edit.

---

## 2. Cloud sync with Firebase

Sync is optional. Without it, data stays on the one device. With it, signing in with the same Google account on another device restores and merges your data.

### 2.1 Create the project

1. Go to <https://console.firebase.google.com> and **Add project** (Analytics is not needed).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.** Pick a support email and save.
3. **Build → Firestore Database → Create database.** Choose a location near you and **Production mode**.
4. **Project settings (gear) → Your apps → Web (`</>`)**. Register an app (skip Firebase Hosting). Copy the `firebaseConfig` values it shows.

### 2.2 Security rules (important)

Publish the rules from [`firestore.rules`](../firestore.rules) so only you can read your data:

- *Console:* **Firestore Database → Rules**, paste the file's contents, **Publish**.
- *CLI alternative:* `npm i -g firebase-tools && firebase login && firebase use <project-id> && firebase deploy --only firestore:rules`.

Without these rules, production mode denies everything and sync will report `permission-denied`.

### 2.3 Allow your site to sign in

**Authentication → Settings → Authorized domains → Add domain:** `berkgerson-ctrl.github.io`
(`localhost` is already allowed for local testing.)

### 2.4 Add the settings to the app

Edit [`js/firebase-config.js`](../js/firebase-config.js) and replace the four `REPLACE_ME` values with the ones from step 2.1, then commit and push. The workflow redeploys automatically.

The Firebase web config is an identifier, not a secret. If you like, restrict the API key to your site under *Google Cloud console → APIs & Services → Credentials → the browser key → Website restrictions* (`https://berkgerson-ctrl.github.io/*`).

### 2.5 First sign-in

1. Open the app → **Rules** tab → **Sign in with Google**.
2. The card should change to **● Synced** with your email.
3. Repeat on a second device. Your shifts, leave and settings appear there.

**Verify once yourself:** add a shift on device A, tap *Sync now*, check it appears on device B after *Sync now*; then check **Firestore Database → Data → users → (your id)** shows the records.

### Troubleshooting

| Message | Cause and fix |
|---|---|
| `Cloud sync not set up` | `js/firebase-config.js` still has `REPLACE_ME`. |
| `auth/unauthorized-domain` | Add your `github.io` domain in 2.3. |
| `permission-denied` | Rules not published (2.2), or signed in on a different project. |
| `auth/popup-blocked` / popup closes | Allow popups for the site. The app falls back to a redirect sign-in where it can. |
| Sign-in does not complete in the installed iPhone app | Sign in once in a normal Safari tab, then reopen the installed app. Browsers increasingly restrict the cross-site storage that redirect sign-in relies on. |
| `Could not load Firebase (offline?)` | The SDK loads from `gstatic.com`; connect once while online. It is cached afterwards. |

---

## 3. Releasing updates

Installed copies cache the app for offline use. After you change any file:

1. Edit `VERSION` in [`sw.js`](../sw.js) (for example `sc-v1` → `sc-v2`).
2. Commit and push to `main`.
3. Users get the new version the next time they open the app online (a second reopen if the app was already open).

Skipping step 1 is the usual reason a change "does not show up".

### Updating an existing site

When you receive an updated copy of the project, upload its files over the repository **but keep your own `js/firebase-config.js`** (the updated copy either leaves it out or contains the placeholder values). The first load after an update upgrades the on-device database automatically and keeps your data.

## Backups

- **Export for payroll** (Rules tab) copies everything as tab-separated text for Google Sheets.
- Firebase gives you a cloud copy; the Firestore console can export it if you want a file.
