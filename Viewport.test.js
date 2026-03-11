import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Canvas context mock ──
const ctxMock = {
    setTransform: vi.fn(),
    scale: vi.fn(),
};

HTMLCanvasElement.prototype.getContext = vi.fn(function () {
    return ctxMock;
});

// ── ResizeObserver mock ──
let roCallback = null;
globalThis.ResizeObserver = vi.fn(function (cb) {
    roCallback = cb;
    this.observe = vi.fn();
    this.disconnect = vi.fn();
});

import { Viewport } from './Viewport.js';

describe('📐 Viewport', () => {
    let canvas, parent;

    beforeEach(() => {
        vi.clearAllMocks();
        roCallback = null;

        // Stub rAF for deduped observer callback
        vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(cb => { cb(); return 1; });

        parent = document.createElement('div');
        canvas = document.createElement('canvas');
        parent.appendChild(canvas);
        document.body.appendChild(parent);

        // Mock parent dimensions
        parent.getBoundingClientRect = () => ({ width: 800, height: 600 });

        // Mock DPR
        Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
    });

    afterEach(() => {
        parent.remove();
        vi.restoreAllMocks();
        Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
    });

    // ── Constructor ──

    describe('constructor', () => {
        it('throws if no canvas provided', () => {
            expect(() => new Viewport({})).toThrow(/canvas.*required/i);
        });

        it('stores canvas and context', () => {
            const vp = new Viewport({ canvas });
            expect(vp.canvas).toBe(canvas);
            expect(vp.ctx).toBe(ctxMock);
            vp.destroy();
        });

        it('performs initial resize', () => {
            const vp = new Viewport({ canvas });
            expect(vp.width).toBe(800);
            expect(vp.height).toBe(600);
            expect(vp.dpr).toBe(2);
            vp.destroy();
        });

        it('sets canvas backing store to width * dpr', () => {
            const vp = new Viewport({ canvas });
            expect(canvas.width).toBe(1600);
            expect(canvas.height).toBe(1200);
            vp.destroy();
        });

        it('sets canvas CSS dimensions', () => {
            const vp = new Viewport({ canvas });
            expect(canvas.style.width).toBe('800px');
            expect(canvas.style.height).toBe('600px');
            vp.destroy();
        });

        it('passes contextOptions to getContext', () => {
            new Viewport({ canvas, contextOptions: { willReadFrequently: true } }).destroy();
            expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith(
                '2d',
                expect.objectContaining({ willReadFrequently: true })
            );
        });
    });

    // ── Resize ──

    describe('resize()', () => {
        it('resets transform before scaling', () => {
            const vp = new Viewport({ canvas });
            ctxMock.setTransform.mockClear();
            ctxMock.scale.mockClear();

            vp.resize();

            expect(ctxMock.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
            expect(ctxMock.scale).toHaveBeenCalledWith(2, 2);

            // setTransform must be called BEFORE scale
            const setTransformOrder = ctxMock.setTransform.mock.invocationCallOrder[0];
            const scaleOrder = ctxMock.scale.mock.invocationCallOrder[0];
            expect(setTransformOrder).toBeLessThan(scaleOrder);
            vp.destroy();
        });

        it('calls onResize callback with dimensions', () => {
            const onResize = vi.fn();
            const vp = new Viewport({ canvas, onResize });
            expect(onResize).toHaveBeenCalledWith(800, 600, 2);
            vp.destroy();
        });

        it('updates dimensions when parent changes', () => {
            const vp = new Viewport({ canvas });
            parent.getBoundingClientRect = () => ({ width: 1024, height: 768 });
            vp.resize();
            expect(vp.width).toBe(1024);
            expect(vp.height).toBe(768);
            vp.destroy();
        });

        it('handles DPR change', () => {
            const vp = new Viewport({ canvas });
            Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });
            vp.resize();
            expect(vp.dpr).toBe(3);
            expect(canvas.width).toBe(800 * 3);
            vp.destroy();
        });

        it('is no-op after destroy', () => {
            const vp = new Viewport({ canvas });
            vp.destroy();
            expect(() => vp.resize()).not.toThrow();
        });

        it('falls back to window dimensions if no parent', () => {
            // Detach canvas from parent
            parent.removeChild(canvas);
            Object.defineProperty(canvas, 'parentElement', { value: null, configurable: true });

            const vp = new Viewport({ canvas, autoResize: false });
            // Should not crash — falls back to window
            expect(vp.width).toBeGreaterThan(0);
            vp.destroy();
        });
    });

    // ── Pixel Getters ──

    describe('pixelWidth / pixelHeight', () => {
        it('returns backing store dimensions (width × dpr)', () => {
            const vp = new Viewport({ canvas });
            expect(vp.pixelWidth).toBe(1600);  // 800 × 2
            expect(vp.pixelHeight).toBe(1200);  // 600 × 2
            vp.destroy();
        });

        it('updates after resize', () => {
            const vp = new Viewport({ canvas });
            parent.getBoundingClientRect = () => ({ width: 400, height: 300 });
            vp.resize();
            expect(vp.pixelWidth).toBe(800);   // 400 × 2
            expect(vp.pixelHeight).toBe(600);   // 300 × 2
            vp.destroy();
        });

        it('returns 0 after destroy', () => {
            const vp = new Viewport({ canvas });
            vp.destroy();
            expect(vp.pixelWidth).toBe(0);
            expect(vp.pixelHeight).toBe(0);
        });
    });

    // ── ResizeObserver ──

    describe('autoResize', () => {
        it('creates a ResizeObserver when autoResize is true', () => {
            const vp = new Viewport({ canvas });
            expect(ResizeObserver).toHaveBeenCalled();
            vp.destroy();
        });

        it('observes the parent element', () => {
            const vp = new Viewport({ canvas });
            const roInstance = ResizeObserver.mock.instances[0];
            expect(roInstance.observe).toHaveBeenCalledWith(parent);
            vp.destroy();
        });

        it('skips ResizeObserver when autoResize is false', () => {
            ResizeObserver.mockClear();
            const vp = new Viewport({ canvas, autoResize: false });
            expect(ResizeObserver).not.toHaveBeenCalled();
            vp.destroy();
        });

        it('triggers resize via observer callback', () => {
            const onResize = vi.fn();
            const vp = new Viewport({ canvas, onResize });
            onResize.mockClear();

            // Simulate a CSS reflow
            roCallback();
            expect(onResize).toHaveBeenCalled();
            vp.destroy();
        });
    });

    // ── Destroy ──

    describe('destroy()', () => {
        it('disconnects ResizeObserver', () => {
            const vp = new Viewport({ canvas });
            const roInstance = ResizeObserver.mock.instances[0];
            vp.destroy();
            expect(roInstance.disconnect).toHaveBeenCalled();
        });

        it('nulls references', () => {
            const vp = new Viewport({ canvas });
            vp.destroy();
            expect(vp.canvas).toBeNull();
            expect(vp.ctx).toBeNull();
            expect(vp.onResize).toBeNull();
        });

        it('is idempotent', () => {
            const vp = new Viewport({ canvas });
            vp.destroy();
            expect(() => vp.destroy()).not.toThrow();
        });
    });
});
