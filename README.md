# Game

A simple browser resource-gathering game, in 3D (top-down camera) with a blocky, 8-bit-style look for
the player and resources. Walk around, click nearby trees/rocks/bushes to collect wood/stone/fiber, and
craft tools that double how much you gather of their resource.

Move with WASD or arrow keys. Click a resource node while you're within range (the faint ring around
your character) to gather from it — it depletes and respawns a few seconds later. Use the Craft panel
to spend resources on an Axe, Pickaxe, or Basket (each doubling the yield of one resource type), or a
Torch (2 Wood, 1 Fiber) — once crafted, your character carries it, lighting the area around you wherever
you go. Crafting equips it immediately; click it again any time to put it away or carry it again — free,
no need to recraft it.

Use the Build panel to place structures — a Wall, Campfire, Storage Chest, or Door — near yourself. Pick
one, then click the ground: a green preview means the spot is valid, red means it's too far, blocked by
something, or you can't afford it. Press R to rotate the preview 90° (handy for lining up Walls and
Doors), Escape or click the selected structure again to cancel. Right-click a Wall, Campfire, or Door to
remove it and get its resources back. Right-click a Storage Chest instead to open it — a popup lets you
move resources between your inventory and the chest, and remove the chest itself (refunding both its
build cost and anything still stored inside). Left-click a placed Door to swing it open or closed.

The world cycles between day and night (a badge in the corner shows which). Ambient light and visibility
dim at night — a placed Campfire lights up your base, and your held Torch (once crafted) goes with you
anywhere else you need to see.

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
