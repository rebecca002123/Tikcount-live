# TokCount Live — Expo React Native

A native-style TikTok public video statistics dashboard built with Expo + TypeScript.

## What is included
- Dark iPhone-friendly UI
- TikTok video URL / numeric ID input
- Views, likes, comments and shares
- Five-second polling
- Views-per-second, per-minute and per-hour pace
- Smooth two-decimal interpolation between real snapshots (clearly labelled as an estimate)
- Milestone progress
- Demo mode for previewing the interface

## Important: connect a real data provider
The TokCount website is a third-party service. Its public page does not document a supported mobile API, and TikTok's official video query API requires an approved developer app, user authorization and the relevant video scope. This project therefore does **not** pretend that demo numbers are live data or scrape undocumented endpoints.

Create a small backend that exposes:

`GET /video-stats?videoId=7709304600095984929`

Return JSON:

```json
{
  "videoId": "7709304600095984929",
  "title": "Your public video title",
  "views": 1486000,
  "likes": 82400,
  "comments": 1830,
  "shares": 12100,
  "updatedAt": "2026-11-23T23:00:00Z"
}
```

The app polls that endpoint every five seconds. The backend can use an authorized TikTok API integration or another data provider whose terms permit this use. Keep provider credentials on the server, never in the Expo app.

## Run on Windows / PowerShell

1. Install Node.js LTS.
2. Extract the ZIP.
3. Open PowerShell in the `tokcount-live-expo` folder.
4. Run:

```powershell
npm install
Copy-Item .env.example .env
```

5. Edit `.env` and set your backend URL:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-api.example.com
```

6. Start Expo:

```powershell
npx expo start
```

7. Install **Expo Go** on your iPhone, scan the QR code, and open the app.

If you have not connected a backend yet, the app will show the connection message and a **Preview demo** button. Demo values are simulated and are not live TikTok data.

## Type-check

```powershell
npm run typecheck
```

## Build a native iOS app

For an iOS App Store / TestFlight build, configure EAS Build:

```powershell
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
```

You need an Apple Developer account for distribution. Replace the example bundle identifier in `app.json` with one you own.

## Notes
- Public videos only; private or removed videos may not be available.
- The fractional display is a rate-based interpolation between real integer snapshots. It is not an official TikTok fractional view count.
- Do not use TokCount branding or imply affiliation if publishing your own app.
