# lite-viewport

[![npm version](https://img.shields.io/npm/v/lite-viewport.svg?style=for-the-badge&color=latest)](https://www.npmjs.com/package/lite-viewport)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/lite-viewport?style=for-the-badge)](https://bundlephobia.com/result?p=lite-viewport)
![TypeScript](https://img.shields.io/badge/TypeScript-Types-informational)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A zero-dependency canvas scaling and resize manager that handles `devicePixelRatio` and CSS layout changes automatically.

No more blurry canvases on Retina screens or manual resize listeners that miss flex/grid reflows.

## Features

- **DPR-aware sizing** — sharp rendering on Retina/HiDPI displays
- **ResizeObserver-based** — responds to CSS flex/grid changes, not just window resize
- **Transform reset** — prevents the cumulative scaling bug on repeated resizes
- **`contextOptions` passthrough** — supports `willReadFrequently`, `alpha: false`, etc.
- **Clean teardown** — `destroy()` disconnects observer and releases references
- **Zero dependencies, < 1 KB**

## Installation

```bash
npm install lite-viewport
```

## Quick Start

```javascript
import { Viewport } from 'lite-viewport';

const canvas = document.querySelector('canvas');

const viewport = new Viewport({
    canvas,
    onResize(width, height, dpr) {
        console.log(`Canvas: ${width}×${height} @ ${dpr}x`);
    },
});

// Canvas is now sized to its parent, scaled for DPR,
// and will auto-resize when the parent's CSS dimensions change.

// Later: clean up
viewport.destroy();
```

## Options

```javascript
const viewport = new Viewport({
    canvas: myCanvas,             // Required: the canvas element
    autoResize: true,             // Watch parent via ResizeObserver (default: true)
    onResize: (w, h, dpr) => {}, // Called after each resize
    contextOptions: {             // Passed to getContext('2d', ...)
        willReadFrequently: true, // Optimize for getImageData-heavy usage
        alpha: false,             // Opaque canvas (slight perf boost)
    },
});
```

## API

| Method | Description |
|--------|-------------|
| `new Viewport(options)` | Create and perform initial resize |
| `.resize()` | Manually trigger a resize |
| `.destroy()` | Disconnect observer, release references. Idempotent. |

| Property | Type | Description |
|----------|------|-------------|
| `.width` | `number` | Current CSS width |
| `.height` | `number` | Current CSS height |
| `.dpr` | `number` | Current devicePixelRatio |
| `.canvas` | `HTMLCanvasElement` | The managed canvas (null after destroy) |
| `.ctx` | `CanvasRenderingContext2D` | The 2D context (null after destroy) |

## The Cumulative Scaling Bug

Most canvas resize code does this:

```javascript
ctx.scale(dpr, dpr); // Called on every resize
```

After 3 resizes at DPR 2: `scale(2) × scale(2) × scale(2) = scale(8)`. Everything is 4× too large.

lite-viewport fixes this by resetting the transform matrix first:

```javascript
ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to identity
ctx.scale(dpr, dpr);                  // Apply fresh
```

## TypeScript

```typescript
import { Viewport, type ViewportOptions } from 'lite-viewport';

const vp = new Viewport({
    canvas: document.querySelector('canvas')!,
    contextOptions: { willReadFrequently: true },
    onResize(w, h, dpr) {
        // fully typed
    },
});
```

## License

MIT
