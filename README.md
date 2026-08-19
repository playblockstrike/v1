# Blockstrike

A first-person voxel shooter with **browser-hosted multiplayer**, built with Vite and Three.js.

No game server to run — one player hosts a match in their tab, others join from the start screen over WebRTC (Trystero / Nostr signaling).

## Run

```bash
npm install
npm run dev
```

Open the URL (default `http://localhost:5174`), then **Host match** or **Join** an active session from the list.

### Public / LAN

Share the Vite URL (or your Tailscale / deployed static build). Anyone on that page can host or join; the host’s browser is the match authority.

## Controls

| Input | Action |
|-------|--------|
| Host / Join | Create or enter a match from the start screen |
| Click | Lock pointer / start playing |
| WASD | Move |
| Mouse | Look around |
| Space | Jump |
| Shift | Sprint |
| Scroll | Switch Shot / Constructor mode |
| Left click (Shot) | Fire |
| Left click (Constructor) | Break block |
| Right click (Constructor) | Place block |
| 1–7 | Select block from hotbar (Constructor) |
| Esc | Release pointer |

## Features

- Browser-hosted matches with live session list on the start screen
- Finite 64×64 block world (4×4 chunks)
- Shared world edits, remote players, synced shots
- Procedural terrain with textured blocks
- First-person movement with gravity and voxel collision
- Shot / Constructor modes with viewmodels
- Spaceships overhead, settings (song volume)

## Build

```bash
npm run build
npm run preview
```
