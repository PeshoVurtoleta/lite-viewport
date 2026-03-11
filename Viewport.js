/**
 * lite-viewport — Zero-dependency Canvas scaling and resize manager
 *
 * Automatically handles devicePixelRatio (DPR) and CSS layout changes
 * via ResizeObserver. Resets the transform matrix before scaling to
 * prevent cumulative scaling bugs on repeated resizes.
 *
 * Features:
 * - DPR-aware canvas sizing (sharp rendering on Retina/HiDPI)
 * - ResizeObserver-based (responds to CSS flex/grid changes, not just window resize)
 * - Transform matrix reset prevents exponential scaling bugs
 * - Optional context options (willReadFrequently, alpha, etc.)
 * - Clean teardown via destroy()
 */

export class Viewport {
    /**
     * @param {Object} options
     * @param {HTMLCanvasElement} options.canvas       The canvas element to manage
     * @param {boolean}          [options.autoResize]  Watch for CSS layout changes. Default: true
     * @param {Function}         [options.onResize]    Called after each resize with (width, height, dpr)
     * @param {Object}           [options.contextOptions] Options passed to getContext('2d', ...).
     *                                                    E.g. { willReadFrequently: true, alpha: false }
     */
    constructor({ canvas, autoResize = true, onResize = () => {}, contextOptions = {} }) {
        if (!canvas) {
            throw new Error("lite-viewport: 'canvas' element is required");
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', contextOptions);
        this.onResize = onResize;

        this.width = 0;
        this.height = 0;
        this.dpr = 1;

        this._destroyed = false;
        this._resizeScheduled = false;

        // ResizeObserver to catch CSS layout changes (flex/grid reflow),
        // not just window resizes. Observe the parent, fallback to body.
        this._ro = null;
        if (autoResize) {
            this._ro = new ResizeObserver(() => {
                // Dedup: observer may fire synchronously on observe() in some
                // browsers, causing a double resize during construction.
                if (!this._resizeScheduled) {
                    this._resizeScheduled = true;
                    requestAnimationFrame(() => {
                        this._resizeScheduled = false;
                        if (!this._destroyed) this.resize();
                    });
                }
            });
            this._ro.observe(this.canvas.parentElement || document.body);
        }

        // Initial sizing
        this.resize();
    }

    /**
     * Measure the parent element and resize the canvas to match,
     * accounting for devicePixelRatio. Resets the context transform
     * to prevent cumulative scaling.
     */
    resize() {
        if (this._destroyed) return;

        const parent = this.canvas.parentElement;
        const rect = parent
            ? parent.getBoundingClientRect()
            : { width: window.innerWidth, height: window.innerHeight };

        this.dpr = window.devicePixelRatio || 1;
        this.width = rect.width;
        this.height = rect.height;

        // Size the backing store
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;

        // Size the CSS layout
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        // Reset transform to identity THEN scale for DPR.
        // Without the reset, repeated resizes compound: scale(2) * scale(2) = scale(4).
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.dpr, this.dpr);

        this.onResize(this.width, this.height, this.dpr);
    }

    /** Backing store width in device pixels (width × dpr). Useful for pixel-level operations. */
    get pixelWidth() { return this.canvas ? this.canvas.width : 0; }

    /** Backing store height in device pixels (height × dpr). Useful for pixel-level operations. */
    get pixelHeight() { return this.canvas ? this.canvas.height : 0; }

    /**
     * Disconnect the ResizeObserver and release references.
     * Idempotent — safe to call multiple times.
     */
    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;

        if (this._ro) {
            this._ro.disconnect();
            this._ro = null;
        }

        this.canvas = null;
        this.ctx = null;
        this.onResize = null;
    }
}

export default Viewport;
