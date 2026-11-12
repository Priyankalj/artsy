# Artsy

Two-sided artist booking app. Customers find an artist and request a booking. Artists onboard, set weekly hours, and accept work.

The mobile app is React Native. The API is Node.js, Express, and PostgreSQL.

## What you can walk through

- OTP login and role choice (artist or customer)
- Artist and customer onboarding
- DigiLocker KYC and a selfie check (mocked when `ENVIRONMENT` is `DEV`)
- Weekly availability
- Create a booking and update its status
- Razorpay checkout (mocked in `DEV`, no live keys in the repo)
- Firebase Cloud Messaging for booking requests and status changes. Code is in the app and the API. Delivery still needs a device test.

## Layout

- `ArtistBooking` — React Native app (Android and iOS)
- `ArtistBackend` — Express API

`ArtistBackend/env.js` is local only and is not in git. Copy the example:

```bash
cp ArtistBackend/env.example.js ArtistBackend/env.js
```

## API

```bash
cd ArtistBackend
npm install
npm run dev
```

Server: `http://localhost:5050`  
Health: `GET /health`

`USE_MEMORY_STORE: true` runs without Postgres. Set it to `false`, point `DB_*` at a database named `serverArt`, then run `schema.sql`.

Route list: `ArtistBackend/README.md`.

## Mobile app

```bash
cd ArtistBooking
npm install
cd ios && pod install && cd ..
npm start
npm run android   # or npm run ios
```

Point the app at the API with `ArtistBooking/config.js` (see `config_dev.js`).

## Private files

Do not commit `ArtistBackend/env.js`, `ArtistBackend/firebaseadmin/*.json`, upload folders, or logs. The Firebase Admin private key stays on your machine.
