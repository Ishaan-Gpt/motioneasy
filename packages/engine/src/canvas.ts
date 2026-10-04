// Offscreen canvases, pooled per frame so layers never allocate in steady state.

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function createCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

export function get2d(c: AnyCanvas): Ctx2D {
  const ctx = c.getContext("2d", { alpha: true }) as Ctx2D | null;
  if (!ctx) throw new Error("2D canvas unavailable");
  return ctx;
}

interface Slot {
  canvas: AnyCanvas;
  ctx: Ctx2D;
  busy: boolean;
}

/** Bucketed pool: sizes are rounded up to multiples of 64 px to maximise reuse. */
export class CanvasPool {
  private slots: Slot[] = [];
  acquire(w: number, h: number): { canvas: AnyCanvas; ctx: Ctx2D } {
    const bw = Math.max(64, Math.ceil(w / 64) * 64);
    const bh = Math.max(64, Math.ceil(h / 64) * 64);
    let slot = this.slots.find((s) => !s.busy && s.canvas.width === bw && s.canvas.height === bh);
    if (!slot) {
      const canvas = createCanvas(bw, bh);
      slot = { canvas, ctx: get2d(canvas), busy: false };
      this.slots.push(slot);
      if (this.slots.length > 160) {
        // Drop idle canvases when a scene churns through many sizes.
        this.slots = this.slots.filter((s) => s.busy || s === slot).concat();
      }
    }
    slot.busy = true;
    const ctx = slot.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.clearRect(0, 0, slot.canvas.width, slot.canvas.height);
    return { canvas: slot.canvas, ctx };
  }
  releaseAll() {
    for (const s of this.slots) s.busy = false;
  }
  dispose() {
    this.slots = [];
  }
}
