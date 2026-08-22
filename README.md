# Game

A simple browser resource-gathering game, in 3D (top-down camera). Walk around, click nearby
trees/rocks/bushes to collect wood/stone/fiber, and craft tools that double how much you gather of
their resource.

Move with WASD or arrow keys. Click a resource node while you're within range (the faint ring around
your character) to gather from it — it depletes and respawns a few seconds later. Use the Craft panel
to spend resources on an Axe, Pickaxe, or Basket, each doubling the yield of one resource type.

Use the Build panel to place structures — a Wall, Campfire, or Storage Chest — near yourself. Pick one,
then click the ground: a green preview means the spot is valid, red means it's too far, blocked by
something, or you can't afford it. Press Escape or click the selected structure again to cancel.
Right-click a placed structure to remove it and get its resources back.

The world cycles between day and night (a badge in the corner shows which). Ambient light and visibility
dim at night — a placed Campfire's warm, flickering glow becomes the best way to light up your base.

## Development

```
npm install
npm run dev
```

Then open the printed local URL in a browser.

## Build

```
npm run build
```

Outputs a static production build to `dist/`.
