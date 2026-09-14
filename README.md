# Qanakagon

A four-minute mental-math challenge built with Expo and React Native.

## Requirements

Install these once on your computer:

- Node.js 24
- Git
- pnpm
- Expo Go on your iPhone

Enable pnpm after installing Node.js:

```powershell
corepack enable
corepack prepare pnpm@latest --activate
```

## Set up on Windows

Open PowerShell in the folder where you keep projects:

```powershell
git clone https://github.com/roysamaag/qanakagon.git
cd qanakagon
pnpm install
```

If GitHub asks you to authenticate, sign in through the browser window it opens.

## Run on an iPhone with Expo Go

Make sure the computer and iPhone are on the same Wi-Fi network, then run:

```powershell
pnpm app:start
```

Scan the QR code with the iPhone camera and open it in Expo Go.

If the phone cannot reach the computer over the local network, use Expo's tunnel mode:

```powershell
pnpm app:tunnel
```

## Other commands

```powershell
pnpm app:test
pnpm run typecheck
pnpm app:web
```

- `app:test` runs the math-engine tests.
- `typecheck` checks TypeScript across the workspace.
- `app:web` opens the web version for quick browser testing.

## App source

The Expo application is in `artifacts/math-challenge`. GitHub is the source of truth; Replit is not required for development or App Store publishing.
