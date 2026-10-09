# WebGL Portfolio Starter

A beginner-friendly Three.js + Vite portfolio for **Olamide / byashthedesigner®**. It creates a lively Lagos-inspired district with a visible low-poly car, smoother acceleration and steering, light drift, body lean, solid building and street-prop collisions, moving traffic, vendors, market stalls, streetlights, trees, colorful buildings, project-stop landmarks, and a third-person follow camera.

The street sound is generated in the browser with the Web Audio API, so the starter stays lightweight and does not ship copied sound recordings. It begins after the first scene click to respect browser autoplay rules and can be muted from the top-right sound control.

## Run it locally

You need a recent version of Node.js installed.

```bash
npm install
npm run dev
```

Vite will print a local address (usually `http://localhost:5173`). Open it in your browser, then drive with:

- `W` / `Arrow Up` — accelerate forward
- `S` / `Arrow Down` — reverse
- `A` / `Arrow Left` — steer left
- `D` / `Arrow Right` — steer right
- Click the 3D scene — capture the mouse and look around the car
- `Esc` — release the mouse
- `H` — sound the car horn
- Sound button — start or mute ambient traffic and random horns

## Create a production build

```bash
npm run build
```

The optimized site will be generated in the `dist` folder.

## Deploy your own copy

The full site lives in this GitHub repository. The local `127.0.0.1` address is only a preview running on your Mac; it is not hosted by HeyClicky and it is not public.

### Vercel (simplest)

1. Sign in to Vercel with the GitHub account that owns this repository.
2. Choose **Add New → Project** and import `olamideash01.github.io`.
3. Keep the detected framework as **Vite**.
4. Use `npm run build` as the build command and `dist` as the output directory.
5. Deploy. Every later push to `main` can automatically create a new production deployment.

### GitHub Pages

This portfolio is published at the account root, `https://olamideash01.github.io/`.

1. Install the locked dependencies with `npm ci`.
2. Run `npm run build:pages` to build assets for the root URL.
3. Run `npm run deploy:pages` to publish `dist` to the `gh-pages` branch.

### Show it locally

For a quick local preview while editing, run `npm run dev`. To test the exact optimized production build, run `npm run build` followed by `npm run preview`.

## Where to add portfolio project stops

Open `src/main.js` and find the `projectStops` array. Each object controls one placeholder building and its proximity pop-up:

```js
{
  category: 'BRANDING / VISUAL DESIGN',
  name: 'Branding House',
  description: 'A short introduction to this project.',
  position: [12, -30],
  size: [8, 6, 8],
  color: '#80ffe8',
  sign: 'BRANDING',
}
```

- `category`, `name`, and `description` appear in the project pop-up when the car approaches the stop.
- `position` is `[x, z]` in the 3D world.
- `size` is `[width, height, depth]`.
- `color` accepts any CSS color.
- `sign` is the large portfolio label shown on the building.

The pop-up can be closed while you remain near a stop. It resets after you drive away, so it can appear again on your next visit. The current **View project** button is intentionally a placeholder. To add real links later, add a `url` field to each `projectStops` item and update the `projectPopupLink` click handler in `src/main.js`.

## Where to add custom Lagos sound files

The current atmosphere and horns are procedural, which keeps the project fast and avoids external audio licensing issues. For your own recorded or licensed sounds later:

1. Create `public/audio/`.
2. Add files such as `lagos-traffic.mp3`, `market-voices.mp3`, and `car-horn.mp3`.
3. In the `LagosSoundscape` class in `src/main.js`, replace or layer the generated nodes with `Audio` elements or decoded Web Audio buffers.
4. Keep the existing first-click start and mute control so browser autoplay behavior still works.

## Project structure

```text
olamideash01.github.io/
├── index.html       # Page structure and interface labels
├── vite.config.js   # Portable production asset paths
├── src/
│   ├── main.js      # Three.js scene, project stops, and movement
│   └── style.css    # Full-screen layout and interface styling
└── package.json     # Vite and Three.js dependencies
```

## Next learning steps

1. **Rapier physics** — replace the lightweight custom colliders if you later want suspension, rigid-body impacts, and more advanced traffic behavior.
2. **GLSL shaders** — create animated road, sky, glow, or transition effects.
3. **Mobile controls** — add a touch joystick and on-screen steering buttons.
4. **Real project content** — replace boxes with Blender models, labels, thumbnails, and case-study panels.
5. **Loading and performance** — learn GLTF loading, texture compression, lazy loading, and a progress screen.

## Built with

- [Three.js](https://threejs.org/)
- [Vite](https://vite.dev/)
- Plain JavaScript (no TypeScript and no physics library yet)
