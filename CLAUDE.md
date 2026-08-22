# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server (default port 5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

There is no lint or test tooling configured.

## Architecture

A 3D, top-down resource-gathering game (walk around, click nodes to collect, craft tools) built with
[three.js](https://threejs.org) (an angled `PerspectiveCamera` that follows the player at a fixed offset,
WASD moves the player in screen-relative X/Z) plus a plain DOM sidebar for inventory/crafting UI, wired
together with Vite. The world (`WORLD_HALF_X`/`WORLD_HALF_Z`) is larger than one screen — the camera and
directional light both track `player.position` every frame (constant `CAMERA_OFFSET`/`SUN_OFFSET`) so the
player stays centered while exploring; the light's shadow frustum is sized to a fixed area around the
player rather than the whole world, since it only ever needs to cover what's on screen.

- `src/main.js` — calls `initGame()` to boot the three.js scene into `#app`, and imports `ui.js` to wire
  up the sidebar. No framework — just two independent entry points sharing `state.js`.
- `src/game.js` — the entire game world: scene/camera/lighting setup, procedural node/player/structure
  meshes (`buildTree`/`buildRock`/`buildBush`, `buildWall`/`buildCampfire`/`buildChest`, a
  `CapsuleGeometry` player — no `assets/` folder, no loaded models), keyboard movement, raycaster-based
  click-to-gather, node respawn, structure placement, and the screen-projected floating pickup/feedback
  text. `RESOURCE_DEFS` at the top controls color/respawn time/count per resource type — add a new type
  there and give it a builder in `BUILDERS`.
- `src/state.js` — the single source of truth for inventory counts, crafted tools, recipes (`RECIPES`),
  placeable structures (`BUILDINGS`), and which one is currently selected for placement
  (`state.selectedBuilding`). Framework-agnostic on purpose: `game.js` (`addResource`, `yieldMultiplier`,
  `canAfford`, `spendResources`) and the DOM UI (`craft`, `canCraft`, `selectBuilding`) read/write through
  it rather than each other, and `onChange` lets the DOM UI re-render whenever it changes.
- `src/ui.js` — renders the inventory, crafting, and build panels into the `#inventory`/`#recipes`/
  `#buildings` elements defined in `index.html`, and handles craft/build button clicks. Plain DOM — the
  game canvas and the sidebar are two independent renderers kept in sync only through `state.js`.
- `src/chestMenu.js` — the popup opened by right-clicking a placed Storage Chest. Self-contained: it
  owns its own DOM element and lifecycle (`openChestMenu`/`closeChestMenu`), subscribes to `state.js`'s
  `onChange` for live inventory numbers, and mutates the chest's own `structure.storage` object directly
  (that per-chest storage isn't part of `state.js` — it lives on the structure record in `game.js`, since
  `state.js` models one global inventory, not N independent chest inventories).

### Building placement

Selecting a structure in the Build panel sets `state.selectedBuilding`; `game.js` reads that flag to
switch its click handler from gather-mode to placement-mode (see the `pointerdown` listener in
`initGame`) and to drive a live ghost preview (`updateGhost`, the `placementGhost` group) that follows
the mouse, snapped to `GRID_SIZE` via `snapToGrid`, tinted green/red by `tintGhost` depending on whether
`tryPlace`'s three checks would pass: in range of the player (`PLACEMENT_RADIUS`), not overlapping an
existing node/structure (`isBlocked`, `PLACEMENT_MIN_DIST`), and affordable (`canAfford`). Placing does
not clear the selection — you stay in placement mode to drop several of the same structure — Escape
(handled in the `keydown` listener) or re-clicking the same Build button cancels it.

To add a new structure type: add an entry to `BUILDINGS` in `state.js` and a builder function in
`STRUCTURE_BUILDERS` in `game.js`; placement, cost-checking, and the ghost preview all pick it up
automatically.

Right-clicking a placed structure removes it and fully refunds its cost (`tryRemove`, bound to the
canvas's `contextmenu` event, separate from the left-click `pointerdown` handler so it can't conflict
with gather/placement). Every structure's mesh is tagged with `mesh.userData.structure` pointing back at
its `{ id, mesh, x, z }` record — same pattern as `mesh.userData.node` on resource nodes — so the
raycast hit can walk up to find the record to remove. `tryRemove` also disposes the mesh's geometry and
materials (`disposeMesh`), unlike node respawn/hide, since structures are actually destroyed rather than
just toggled invisible and reused. `tryRemove` returns `true`/`false` (whether it actually removed
anything, e.g. `false` if the player was out of `PLACEMENT_RADIUS`) — `chestMenu.js`'s "Remove chest"
button only closes the popup when it gets `true` back, so a failed removal leaves the menu open with its
`Too far` feedback visible instead of silently closing.

Storage Chests are the one structure type right-click doesn't demolish directly: the `contextmenu`
handler special-cases `structure.id === 'chest'` to open `chestMenu.js`'s popup instead (any other
structure still demolishes immediately). That popup's own "Remove chest" button is what calls
`tryRemove`, and since it refunds `structure.storage` alongside the chest's own build cost, nothing
stored inside is lost when a chest is torn down.

Gather interaction is proximity-based, not click-adjacent: a click raycasts against node meshes to find
*which* node was clicked, then a separate flat-distance check (`INTERACT_RADIUS`, in world X/Z) against
the player's position decides whether the click actually lands. Keep both checks if you touch this path —
the raycast alone doesn't enforce range.

A depleted node doesn't respawn in place — `tryGather`'s `setTimeout` calls `pickSpot` again (same
`NODE_MARGIN`/`NODE_MIN_DIST` used at world-build time) to relocate it somewhere else clear of every
other node and structure, then moves its existing mesh there rather than creating a new one.

The floating "+1" pickup text (`floatText`) re-projects the node's world position to screen space on
every frame for its short lifetime, not just once — since the camera moves every frame too, a one-shot
projection would drift out of alignment with the node while it fades.

To add a new craftable tool: add an entry to `RECIPES` in `state.js` with a `boosts` field naming the
resource type it doubles — `yieldMultiplier()` and the UI panel pick it up automatically.

### Day/night cycle

A full cycle is `DAY_LENGTH_MS` (90s), driven off `timer.getElapsed()` so it's tied to elapsed game time,
not wall-clock time. Each frame computes `dayFactor` (0 = midnight, 1 = noon) from a sine wave phased so
the game starts at full day, then lerps the "unlit" scene properties that don't respond to light on
their own — `scene.background`/`scene.fog` color, fog near/far, and the `gridHelper` line tint — between
paired `DAY_*`/`NIGHT_*` constants, plus the `ambient`/`sun` lights' intensity and color. Everything else
(ground, trees, rocks, player, structures) uses `MeshStandardMaterial` and darkens on its own as those
lights dim — don't add manual tinting for new lit geometry, only for new *unlit* (`MeshBasicMaterial`/
`LineBasicMaterial`) elements. `initGame()` returns a `getTimeOfDay()` getter exposing `{ isDay, dayFactor }`; `main.js` polls it every
500ms to flip the `#dayNight` badge.

Placed campfires get an organic flicker independent of the day/night lerp: `buildCampfire` tags its
`PointLight` with `userData.baseIntensity`, and the animate loop walks every entry in `structures` each
frame applying a two-frequency sine wiggle on top of that base value. A stronger point light
(intensity 1.8, range 9) than the original tuning was needed for the glow to read clearly once night
darkens the ambient/sun down near their `NIGHT_*` floors — if you add another light-emitting structure,
tag it with `baseIntensity` the same way to get the flicker for free.

## Notes for future instances

- This folder is a git repository scoped to itself — do not run `git init` in a parent directory that
  contains unrelated files (e.g. the user's home directory).
