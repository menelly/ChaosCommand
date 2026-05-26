# Privacy Policy — Chaos Command

> **Status: DRAFT — not yet reviewed by a lawyer.** See `legal/README.md` for the
> fill-in list (entity address, contact email, effective date) and the open
> privacy items before this goes live.
>
> **Effective date:** _[TO FILL]_
> **Provided by:** Silicon Scaffolding LLC ("we," "us," "our")
> **Applies to:** the Chaos Command application (desktop and mobile) and the
> website at chaoscommand.center.

---

## Part 1 — In Plain Language

**The short version: your health data never reaches us. We can't read it, sell it,
lose it, or hand it over, because it never leaves your device unless *you* send it
somewhere.**

Here's what that actually means:

- **There is no account.** You don't sign up, give us an email, or create a login.
  You unlock the app with a PIN that stays on your device. We don't know who you are.
- **There is no server holding your data.** Everything you log — symptoms,
  medications, appointments, journals, everything — is stored locally on your own
  device. We have no copy. We have no database of users. There is nothing for us to
  breach, subpoena, or monetize.
- **We don't track you.** No analytics that phone home, no advertising trackers, no
  cookies that follow you around. The charts and patterns the app shows you are
  calculated *on your device*, from your data, and stay there.
- **Backups are yours and encrypted.** When you export a backup, it's encrypted with
  AES-256 using a password *you* choose, and saved wherever *you* put it. We never
  receive it and can't open it.
- **Sync is device-to-device.** If you sync between your own devices, the data goes
  directly between them — it does not pass through us. We can't see it in transit and
  we don't store it.

**The handful of times the app does talk to the internet — and exactly what's shared:**

1. **Checking for updates.** The app can check `chaoscommand.center/version.json` to
   see if a newer version exists. Like any web request, our server briefly sees your
   IP address and the time of the request. We don't log this to profile you, and you
   can turn update-checking off in Settings.
2. **Images you add by link.** If you paste an image *URL* into the app, your device
   fetches that image from wherever you pointed it. That's a request to that third
   party, initiated by you.
3. **Document parsing (desktop only).** If you use the optional document-parsing
   feature on the desktop app, the app downloads a medical language model from Hugging
   Face the first time you run it. The download is the model itself — *your document and
   its text are read and processed entirely on your device and are never uploaded.*
   This feature is not present in the mobile app.

That's the whole list. No part of your medical information is in any of those requests.
**Fonts are bundled with the app** — we self-host every typeface, so the app makes no
request to Google or any other font service.

**Your rights are simple here because we hold nothing:** you can view, edit, export,
and permanently delete all of your data yourself, from within the app, at any time,
without asking us — because you're the only one who has it.

---

## Part 2 — The Formal Version

### 1. Scope
This Privacy Policy describes how Silicon Scaffolding LLC ("Company") handles
information in connection with the Chaos Command software application ("App") and the
website located at chaoscommand.center ("Site," and together with the App, the
"Services"). By using the Services you acknowledge this Policy.

### 2. No Account; No Personal Information Collected by the Company
The App does not require or provide account registration, authentication credentials,
email addresses, or any direct identifier. Access to local data is controlled by a
user-selected PIN stored only on the user's device. The Company does not collect,
receive, or maintain personally identifiable information about users through the App.

### 3. Local-Only Data Storage
All user-entered content — including but not limited to health, symptom, medication,
appointment, reproductive, mental-health, and free-text journal data ("User Data") —
is stored locally on the user's device using on-device storage (IndexedDB/Dexie in the
web/desktop runtime and equivalent local storage in the mobile runtime). The Company
operates no server, database, or cloud service that receives, stores, or processes User
Data. The Company has no technical ability to access User Data.

### 4. No Analytics, Tracking, or Advertising
The App contains no third-party analytics SDKs, advertising identifiers, behavioral
trackers, or first-party telemetry that transmits usage data to the Company. All
computed metrics, trends, and visualizations are generated locally on the device.

### 5. Limited Network Communications
The Services initiate outbound network requests only in the following circumstances,
none of which transmit User Data:
   (a) **Update checks.** The App may request a version manifest from
   `https://chaoscommand.center/version.json`. As an incident of any HTTP request, the
   serving infrastructure may transiently process the requesting IP address, timestamp,
   and user-agent string. This feature can be disabled by the user in Settings.
   (b) **User-initiated image retrieval.** Where a user supplies a remote image URL,
   the device retrieves that resource directly from the third-party host designated by
   the user.
   (c) **On-device document parsing (desktop only).** The optional document-parsing
   feature in the desktop application retrieves a machine-learning model from a
   third-party model host (Hugging Face) on first use. Inference is performed locally on
   the user's device; document content is not transmitted. This feature is not included
   in the mobile application.

All typefaces are self-hosted and bundled with the App; the App makes no request to any
third-party font service (e.g., Google Fonts) and the application's content-security
policy prohibits such requests.

### 6. Site (Website) Data
The Site is a static distribution and informational site. The Site sets no first-party
tracking cookies and integrates no advertising or analytics services operated for the
Company's behavioral profiling. The web server may maintain standard access logs (e.g.,
IP address, timestamp, requested resource, user-agent) for operational, security, and
abuse-prevention purposes; such logs are not used to identify individual users and are
retained only as operationally necessary. _[Confirm Caddy log configuration/retention —
see README.]_

### 7. Backups, Export, and Sync
   (a) **Export.** Encrypted backups are generated locally using AES-256-GCM with a
   user-supplied passphrase and key derivation (PBKDF2). The Company never receives the
   backup file or the passphrase and cannot decrypt exported data. An optional
   plain-text (unencrypted) export is available behind an explicit warning and is the
   user's sole responsibility to safeguard.
   (b) **Device-to-Device Sync.** Where offered, synchronization occurs directly
   between the user's own devices. User Data is not routed through, stored on, or
   accessible to any Company-operated intermediary.

### 8. Children's Data
The App may be used by or on behalf of minors at the discretion of a parent or
guardian, including via separate PIN-scoped local profiles. Because the Company
collects no data, it does not knowingly collect personal information from any person,
including children under 13. All such data remains local to the device under the
caregiver's control.

### 9. Data Subject Controls
Because all User Data resides solely on the user's device, the user may at any time and
without request to the Company: access and review all data within the App; modify or
correct data; export data (encrypted or plain-text); and permanently and irreversibly
delete a PIN-scoped profile's data via the App's Data Management controls. The Company
cannot perform these actions on a user's behalf and cannot recover deleted data.

### 10. Disclosure to Third Parties
The Company does not sell, rent, share, or disclose User Data, because it does not
possess User Data. The Company cannot produce User Data in response to legal process,
as it holds none.

### 11. Security
The App is designed to keep data on-device and supports user-controlled encryption for
exported backups. No method of electronic storage is perfectly secure; the security of
data residing on a user's device depends in part on that device's own security
(passcode, disk encryption, physical control), which is the user's responsibility.

### 12. Changes to this Policy
The Company may update this Policy. Material changes will be reflected by an updated
effective date and, where practicable, noted within the Services.

### 13. Contact
Questions regarding this Policy may be directed to _[CONTACT EMAIL — TO FILL]_,
Silicon Scaffolding LLC, _[ENTITY ADDRESS — TO FILL]_.
