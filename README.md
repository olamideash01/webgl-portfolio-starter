# WebGL Portfolio Starter

A beginner-friendly Three.js + Vite starter for **Olamide / byashthedesigner®**. It creates a simple driveable 3D portfolio world with a ground plane, project-stop buildings, atmospheric lighting, a gradient sky, and keyboard movement.

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

## Create a production build

```bash
npm run build
```

The optimized site will be generated in the `dist` folder.

## Where to add portfolio project stops

Open `src/main.js` and find the `projectStops` array. Each object controls one placeholder building:

```js
{
  name: 'New Project',
  position: [12, 3, -30],
  size: [8, 6, 8],
  color: '#80ffe8',
}
```

- `name` is shown when the camera approaches the stop.
- `position` is `[x, y, z]` in the 3D world.
- `size` is `[width, height, depth]`.
- `color` accepts any CSS color.

Later, each stop can open a project panel, load a 3D model, play a reel, or link to a full case study.

## Project structure

```text
webgl-portfolio-starter/
├── index.html       # Page structure and interface labels
├── src/
│   ├── main.js      # Three.js scene, project stops, and movement
│   └── style.css    # Full-screen layout and interface styling
└── package.json     # Vite and Three.js dependencies
```

## Next learning steps

1. **Rapier physics** — add colliders so the camera cannot drive through buildings.
2. **GLSL shaders** — create animated road, sky, glow, or transition effects.
3. **Mobile controls** — add a touch joystick and on-screen steering buttons.
4. **Real project content** — replace boxes with Blender models, labels, thumbnails, and case-study panels.
5. **Loading and performance** — learn GLTF loading, texture compression, lazy loading, and a progress screen.

## Built with

- [Three.js](https://threejs.org/)
- [Vite](https://vite.dev/)
- Plain JavaScript (no TypeScript and no physics library yet)
