# Game

A simple browser resource-gathering game, in 3D (top-down camera). Walk around, click nearby
trees/rocks/bushes to collect wood/stone/fiber, and craft tools that double how much you gather of
their resource.

Move with WASD or arrow keys. Click a resource node while you're within range (the faint ring around
your character) to gather from it — it depletes and respawns a few seconds later. Use the Craft panel
to spend resources on an Axe, Pickaxe, or Basket, each doubling the yield of one resource type.

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
