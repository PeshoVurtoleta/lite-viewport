/**
 * lite-viewport — Zero-dependency Canvas scaling and resize manager
 */

export interface ViewportOptions {
    /** The canvas element to manage. Required. */
    canvas: HTMLCanvasElement;
    /** Watch for CSS layout changes via ResizeObserver. Default: true */
    autoResize?: boolean;
    /** Called after each resize with (width, height, dpr). */
    onResize?: (width: number, height: number, dpr: number) => void;
    /** Options passed to canvas.getContext('2d', ...). E.g. { willReadFrequently: true } */
    contextOptions?: CanvasRenderingContext2DSettings;
}

export class Viewport {
    /** Current CSS width of the canvas. */
    readonly width: number;
    /** Current CSS height of the canvas. */
    readonly height: number;
    /** Current devicePixelRatio. */
    readonly dpr: number;
    /** The managed canvas element (null after destroy). */
    readonly canvas: HTMLCanvasElement | null;
    /** The 2D rendering context (null after destroy). */
    readonly ctx: CanvasRenderingContext2D | null;

    /** Backing store width in device pixels (width × dpr). */
    readonly pixelWidth: number;
    /** Backing store height in device pixels (height × dpr). */
    readonly pixelHeight: number;

    constructor(options: ViewportOptions);

    /** Manually trigger a resize. Measures parent, updates canvas, resets transform. */
    resize(): void;

    /** Disconnect ResizeObserver and release references. Idempotent. */
    destroy(): void;
}

export default Viewport;
