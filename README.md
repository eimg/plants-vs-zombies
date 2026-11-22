# Plants vs. Zombies 3D

A short, vertical, mobile-friendly single-level 3D recreation of **Plants vs. Zombies** built with **Three.js** and **Vite**, playable directly in any modern mobile or desktop browser with Burmese (မြန်မာဘာသာ) UI.

**Play Live:** [https://eimaung.com/plants-vs-zombies/](https://eimaung.com/plants-vs-zombies/)

---

## Highlights

- **Vertical Mobile-First 3D Lawn:** 5 lanes × 9 rows oriented top-to-bottom with dynamic camera framing that adapts to portrait phones, tablets, and desktop screens.
- **Short Single-Level Showdown:** Escalating zombie waves culminating in a **Final Wave**, designed for quick ~80–90 second sessions.
- **5 Classic Plants + Dig Tool:**
  - **Sunflower (`နေကြာ` — 50 Sun):** Generates `+25` Sun on the lawn.
  - **Peashooter (`ပဲပစ်ပင်` — 100 Sun):** Fires green peas up its lane.
  - **Wall-nut (`သစ်ကြား` — 50 Sun):** High-HP defensive blocker with progressive damage cracks.
  - **Snow Pea (`ရေခဲပဲ` — 175 Sun):** Fires frost peas that chill and slow zombies.
  - **Cherry Bomb (`ချယ်ရီဗုံး` — 150 Sun):** Detonates in a 3×3 radius with shockwave rings and camera shake.
  - **Shovel (`တူး`):** Dig up placed plants to reorganize defenses.
- **4 Zombie Types & 5 Lawnmowers:** Basic, Conehead (knock-off traffic cone), Buckethead (knock-off metallic bucket), and Flag Zombie leading the Final Wave — backed by one-time safety lawnmowers per lane.
- **Zero External Media Assets:** All 3D models, PBR canvas textures, sky reflections, particle effects, and Web Audio API sound effects are generated procedurally in code.

---

## Controls

### Mobile / Touch
- **Collect Sun:** Tap or swipe over falling Suns (always prioritized over planting so you never waste a selected seed).
- **Plant:** Tap a seed packet in the bottom tray, then tap any empty grass tile.
- **Dig:** Tap `တူး`, then tap an existing plant to remove it.

### Desktop
- **Mouse:** Click Suns to collect; click a seed packet and click a tile to plant (with live 3D ghost preview).
- **Keyboard Shortcuts:**
  - `1`–`5`: Select seed packets
  - `S` or `X`: Toggle Shovel (`တူး`)
  - `P`: Pause / Resume
  - `Esc`: Cancel selection or toggle Pause

---

## Local Development

Requires Node.js 18+.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build static production bundle into dist/
npm run build

# Preview the production build locally
npm run preview
```

The Vite config uses `base: './'`, so the static `dist/` output can be hosted at a root domain or any subpath (e.g. `/plants-vs-zombies/`).

---

## Project Structure

```text
├── index.html          # Viewport, HUD, and Start / Pause / Victory / Game Over modals
├── vite.config.js      # Vite config with relative asset base path
└── src/
    ├── main.js         # UI bindings, seed packet SVGs, and keyboard shortcuts
    ├── style.css       # Mobile-first responsive HUD and Burmese typography styling
    ├── config.js       # Grid sizing, economy, plant/zombie stats, and wave timeline
    ├── game.js         # Three.js scene, camera framing, raycasting, combat loop
    ├── models.js       # Procedural 3D yard, lawnmowers, plants, zombies, suns, peas
    ├── textures.js     # Procedural Canvas PBR textures and garden sky environment map
    ├── particles.js    # Hit bursts, pea trails, explosions, debris, ambient pollen motes
    └── audio.js        # Procedural Web Audio API sound synthesizer
```

---

## License

This project is licensed under the [MIT License](LICENSE).

> *Plants vs. Zombies* is a trademark of Electronic Arts / PopCap Games. This project is an unofficial fan-made browser experiment created for learning and fun.
