# Next coming list — Artist Booking

**Monday, 16 Nov 2026:** device-test Firebase push before any interview. Use a real Android phone, or an iPhone with a paid Apple Developer account. The resume already says booking alerts are built. Confirm a real device gets the push when a booking is created, and the other role does not.

Ordered. Do not start item N+1 until the previous “done when” is true, except where marked parallel.

## 0. Firebase push (two audiences)

**Why:** Artists and customers must get different messages (new request vs booking confirmed).

**How (Floatr pattern):**
1. One Firebase project. App requests permission, calls `messaging().getToken()`, sends the token to the API with the logged-in user.
2. Store **one** phone address on `users` (`device_token`, `device_platform`) — same as Floatr. Role stays on `users.role`. Switching phones or another login on this phone overwrites / clears the old address.
3. Backend sends with Firebase Admin SDK. Pick recipients by **user id**, then the role only decides the **copy and deep link**.

| Event | Who gets it | Example |
|-------|-------------|---------|
| Booking created | That artist’s user_id | “New booking request” → Artist Bookings |
| Status confirmed / cancelled | Customer’s user_id | “Your booking is confirmed” → Bookings |
| Review received | Artist | “New review” → Profile |
| Verification approved / rejected | Artist | “You’re live” / “Fix documents” |

Same app binary. Do **not** make two Firebase apps. Topic `artists` / `customers` is optional for broadcasts only; booking alerts must be **token-to-user**, not a topic (topics would notify every artist).

**Done when:** a real device gets a push when `POST /bookings` succeeds, and the other role does not.

**Parked (3 Nov 2026):** code is in (token on `users`, send on booking/status). Device-test blocked — personal Apple team cannot sign Push Notifications, no Android phone on hand. Resume when a paid Apple Developer account or an Android device is available. Do not treat this item as launched.

### Implementation flow (do this in order)

One Firebase project. One app binary. Role is only a **filter** on the server.

```
App (after login)
  request permission → messaging().getToken()
  POST /users/me/device-token { token, platform }
Backend
  save users.device_token (clear that token from any other user first)
Send
  1:1  → user_id → users.device_token → FCM
  bulk → SQL audience → those users.device_token → FCM in batches of 500
```

**1. Firebase console**
- Create one project (e.g. `artsy-app`).
- Add iOS + Android apps with this bundle/package.
- Download `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) into the RN folders (same as Floatr).
- Project settings → Service accounts → generate JSON. Put path in `env.js` as `FIREBASE_SERVICE_ACCOUNT` (never commit).

**2. Schema** (column on `users`, not a separate table)

```sql
ALTER TABLE users ADD COLUMN device_token TEXT;
ALTER TABLE users ADD COLUMN device_platform VARCHAR(16); -- ios | android
```

**3. Mobile (Floatr pattern)**
- After OTP / session restore: `requestPermission()` then `getToken()`, POST to the API.
- `onTokenRefresh` → POST again (token can rotate).
- Foreground: `@notifee/react-native` shows the banner (`useNotificationHandler` in Floatr).
- Background / killed: FCM shows it; tap payload `data.screen` + `data.booking_id` to open the right stack (artist bookings vs customer bookings).
- Logout: `DELETE /users/me/device-token` so the next owner of the phone is not pinged.

**4. Backend send helper** (`ArtistBackend/src/services/push.js`)
- Init `firebase-admin` once with the service account.
- `sendToUser(userId, { title, body, data })` — load `users.device_token`, send, clear it if FCM says the token is dead.
- `sendToAudience({ role, minCompletedBookings, maxCompletedBookings })` — SQL first, then `sendEachForMulticast` in chunks of 500 (FCM limit). Same helper as 1:1; only the **query** changes.

**5. Transactional (1:1) — never a topic**

| Event | Query | Payload |
|-------|--------|---------|
| Booking created | `artists.user_id` for that `artist_id` | `{ screen: 'Bookings', booking_id }` |
| Status change | `bookings.customer_user_id` | `{ screen: 'Bookings', booking_id }` |

Hook these inside `POST /bookings` and `PATCH /bookings/:id/status`. Do not `subscribeToTopic('artists')` for this — that would ping every artist.

### Bulk campaigns (offers) — query, then send

**Topics are the wrong tool for “3rd order”.** A topic `customers` would notify every customer, including people with 0 bookings. Topics cannot express “completed_bookings = 2”. Use Postgres as the audience builder.

**3rd-order offer for customers only:**

```sql
SELECT u.device_token AS token, u.user_id
FROM users u
LEFT JOIN (
  SELECT customer_user_id, COUNT(*) AS completed
  FROM bookings
  WHERE status = 'completed'   -- later: AND payment_status = 'paid'
  GROUP BY customer_user_id
) b ON b.customer_user_id = u.user_id
WHERE u.role = 'user'          -- artists excluded here
  AND u.device_token IS NOT NULL
  AND COALESCE(b.completed, 0) = 2;  -- next booking is the 3rd
```

Then send in batches of 500 with copy like “Your 3rd booking — 10% off” and `data: { screen: 'Home', campaign: 'third_order' }`.

| Campaign | Filter |
|----------|--------|
| All customers | `role = 'user'` |
| All artists | `role = 'artist'` |
| 3rd-order offer | `role = 'user'` AND completed bookings = 2 |
| Bangalore artists | `role = 'artist'` AND location match |

Optional later: subscribe to topics `role_user` / `role_artist` **only** for true broadcasts (“app update”). Offers with a condition stay SQL → tokens.

**Admin API (you trigger, not the app):** `POST /admin/campaigns` with `{ audience: 'users_third_order', title, body }`. Do not expose this to normal JWTs.

**Done when (campaigns):** a test customer with 2 completed bookings gets the offer; an artist with 2 completed bookings does not.

### Also in this slice (describe, build after push pipe exists)

- **Notify on new booking** — hook inside booking create; lookup `artists.user_id` → device tokens → FCM. Also SMS/email once MSG is live.
- **Availability** — `artist_availability(artist_id, date, is_blocked)` or weekly slots. `POST /bookings` rejects a blocked date before payment.
- **Reviews** — only after `status = completed`. One review per booking. See rating (item 4).
- **Profile edit** — reuse onboard update APIs behind Profile screens (price, bio, photos). Do not force full re-onboard.
- **Postgres staging** — `USE_MEMORY_STORE: false`, apply `schema.sql` + booking columns the memory store already uses, point a staging `env` at that DB. Stop treating memory as the source of truth.

## 1. SMS + email (MSG91)

**Status:** backend wired + Floatr-style DEV/PROD gates. Fill MSG91 keys in `env.js` after DLT templates exist. `ENVIRONMENT=DEV|UAT|LOCAL` → OTP always `1234`, revealed in API, MSG91 skipped. Only `PROD` (or `FORCE_EXTERNAL_SERVICES`) sends SMS/email. Booking email is ready but skipped until users have an email.

**Why:** OTP and booking alerts must leave the phone even if the app is killed. DEV may still return OTP in the API; production must not.

**How to connect MSG91:**
1. Create an MSG91 account → **SMS** → DLT-approved template (India) for OTP and for “booking confirmed”.
2. **Email** → verify a sender domain → template for the same events.
3. Put in `env.js` (never commit): `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID`, `MSG91_SENDER_ID`, `MSG91_EMAIL_TEMPLATE_ID`.
4. Backend service `src/services/notify.js`:
   - `sendOtpSms(phone, otp)` on `POST /auth/otp/request` (after cooldown checks).
   - `sendBookingSms` / `sendBookingEmail` from the same events as push.
5. Flow: save OTP → call MSG91 → if MSG91 fails, do not pretend success.

API shape (OTP): `POST https://control.msg91.com/api/v5/otp` with `template_id`, `mobile` (`91` + 10 digits), `authkey`.

**Done when:** a real handset receives the OTP SMS and the app no longer needs the OTP printed on screen in a non-DEV env.

## 2. DigiLocker + selfie match

**Status:** wired (associate + Gridlines pattern). DEV (`KYC_MOCK_RESPONSE` / `ENVIRONMENT=DEV`) bypasses Gridlines with hardcoded Aadhaar + face match so login/onboarding completes. PROD uses Gridlines DigiLocker + `/face-api/verify`. Public `verified` badge is not set at profile create.

**Why:** “Verified” must mean identity checked, not “form submitted”.

**How (associate-app pattern):**
1. Artist finishes profile, then **DigiLocker** (Aadhaar). Partner flow: start session → user consents in DigiLocker → callback returns photo + masked id.
2. Store DigiLocker photo as a document (`document_type = aadhaar_photo`). Do not store full Aadhaar number if you only need match + last 4.
3. Artist takes a **live selfie** (camera already in the app).
4. Face-match vendor (or DigiLocker partner’s match API) compares selfie vs DigiLocker photo.
5. Persist `verification_status`: `pending` → `face_matched` → human `approved` / `rejected`.
6. Public `verified` badge **only** after `approved`. Today onboard sets verified immediately — that must stop.

**Done when:** a test artist cannot appear as verified until DigiLocker photo and selfie match, and a mismatch shows a clear error (associate copy: selfie does not match Aadhaar photo).

## 3. Payments — Razorpay UAT then live

**Status (DEV):** wired without a Razorpay account. `MOCK_PAYMENTS` / empty keys → mock order + confirm → booking saved with `payment_status=paid` + `payment_mock=true`. With `rzp_test_*` in `env.js` and `MOCK_PAYMENTS: false`, Checkout uses real Test API. Webhook + live keys still TODO.

**Why Razorpay here:** already in the mobile dependency list, standard for India (UPI, cards, netbanking), Route later for artist payouts, test keys without a long bank integration. Cashfree / PayU are fine alternatives; switching now only delays launch. Stay on Razorpay unless payout or pricing forces a change.

**How to get access:**
1. Sign up at [razorpay.com](https://razorpay.com) → complete KYC (PAN, GST if registered, bank, business proof).
2. **Test mode** is available before full KYC: Dashboard → switch to Test → copy `key_id` (`rzp_test_…`) and `key_secret`.
3. **Live** after KYC approval: Live mode → `rzp_live_…`. Never put the secret in the app; only the key id goes to the client.
4. Backend:
   - `POST /payments/order` creates a Razorpay order for the server-calculated amount (do not trust the app total).
   - App opens `react-native-razorpay` Checkout with `order_id` + key id.
   - Webhook `payment.captured` (Dashboard → Webhooks, test URL via ngrok, live URL on the API) marks booking `paid`.
5. Env: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

**Done when:** test card/UPI pays a booking, webhook sets `payment_status = paid`, and a failed payment does not confirm the booking.

## 4. Rating

**Rules:**
- A customer can review only their own booking after `completed` and `paid`.
- One review per booking: stars 1–5 + optional text.
- Do not let the artist edit the score.

**Score shown on cards:**
- `rating` = average of review stars (round to 1 decimal).
- `reviews` = count of reviews.
- `bookings_count` = completed bookings (already a column — increment on complete, do not fake it).
- Sort “top artists” by rating, then bookings_count. New artists with 0 reviews show “New” instead of 0.0 stars.
- Optional later: weight recent reviews more. Do not bake “number of bookings” into the star itself or a busy new artist looks better than a careful one.

**Done when:** completing a paid booking lets the customer submit stars once, and Home/Search show the new average.

## Order to build

1. Push token table + notify artist on new booking  
2. MSG91 OTP SMS (email template in parallel)  
3. Razorpay test mode on create-booking  
4. Verification: pending until DigiLocker + selfie match + approve  
5. Availability check before pay  
6. Reviews + rating fields updated from real reviews  
7. Profile edit  
8. Postgres staging as the only staging database  
9. Razorpay live after KYC  
10. Artist payouts (Razorpay Route) — after live payments
