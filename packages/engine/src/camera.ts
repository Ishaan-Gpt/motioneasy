// A real perspective camera over 2.5D layers, the After Effects model. World units are reference units
// with the origin at the frame centre, y down, z into the screen. A plane at z = 0 with no rotation is
// drawn 1:1, like CSS `perspective`. Focal length comes from the short edge so every format has the same
// perspective strength.

import { rad } from "./math";

export type V3 = [number, number, number];
export type M3 = [number, number, number, number, number, number, number, number, number];

export function rotation(rx = 0, ry = 0, rz = 0): M3 {
  const [a, b, c] = [rad(rx), rad(ry), rad(rz)];
  const cx = Math.cos(a), sx = Math.sin(a);
  const cy = Math.cos(b), sy = Math.sin(b);
  const cz = Math.cos(c), sz = Math.sin(c);
  // R = Ry · Rx · Rz (roll first, then tilt, then pan), like CSS rotateY() rotateX() rotateZ().
  const Rz: M3 = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  const Rx: M3 = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  const Ry: M3 = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  return mul(Ry, mul(Rx, Rz));
}

export function mul(A: M3, B: M3): M3 {
  const o = new Array(9) as M3;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
  return o;
}
export const apply = (M: M3, v: V3): V3 => [
  M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
  M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
  M[6] * v[0] + M[7] * v[1] + M[8] * v[2],
];
export const transpose = (M: M3): M3 => [M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]];

export interface CameraOpts {
  /** Vertical-ish field of view over the short edge, degrees. 20 = long lens (flat), 50 = wide (dramatic). */
  fov?: number;
  /** Camera position offset from its rest position. z > 0 dollies in. */
  x?: number;
  y?: number;
  z?: number;
  /** Camera rotation, degrees. rx tilts, ry pans, rz rolls. */
  rx?: number;
  ry?: number;
  rz?: number;
  /** Orbit around this world point instead of rotating in place. */
  orbit?: V3;
  /** Depth of field: world z that is sharp, and blur (ref units) per 1000 units of defocus. */
  focus?: number;
  aperture?: number;
}

export interface Projected {
  x: number;
  y: number;
  z: number; // camera-space depth
  scale: number;
}

export class Camera {
  readonly f: number;
  readonly pos: V3;
  readonly R: M3;
  readonly Rt: M3;
  readonly focus: number;
  readonly aperture: number;
  constructor(readonly W: number, readonly H: number, o: CameraOpts = {}) {
    const fov = o.fov ?? 30;
    this.f = Math.min(W, H) / 2 / Math.tan(rad(fov) / 2);
    this.R = rotation(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    this.Rt = transpose(this.R);
    if (o.orbit) {
      // Rest position sits f in front of the orbit target; rotate that offset around the target.
      const back = apply(this.R, [0, 0, -(this.f - (o.z ?? 0))]);
      this.pos = [o.orbit[0] + back[0] + (o.x ?? 0), o.orbit[1] + back[1] + (o.y ?? 0), o.orbit[2] + back[2]];
    } else {
      this.pos = [o.x ?? 0, o.y ?? 0, -this.f + (o.z ?? 0)];
    }
    this.focus = o.focus ?? 0;
    this.aperture = o.aperture ?? 0;
  }
  toCamera(p: V3): V3 {
    return apply(this.Rt, [p[0] - this.pos[0], p[1] - this.pos[1], p[2] - this.pos[2]]);
  }
  project(p: V3): Projected {
    const c = this.toCamera(p);
    const z = Math.max(1e-3, c[2]);
    const s = this.f / z;
    return { x: this.W / 2 + c[0] * s, y: this.H / 2 + c[1] * s, z: c[2], scale: s };
  }
  /** Defocus blur radius (ref units) for a world z, from the DOF settings. */
  defocus(worldZ: number) {
    if (!this.aperture) return 0;
    const d = Math.abs(this.toCamera([0, 0, worldZ])[2] - this.toCamera([0, 0, this.focus])[2]);
    return (d / 1000) * this.aperture;
  }
}

export interface PlaneOpts {
  x?: number;
  y?: number;
  z?: number;
  w: number;
  h: number;
  rx?: number;
  ry?: number;
  rz?: number;
  scale?: number;
  /** Anchor inside the plane, 0..1. Default centre. */
  anchor?: [number, number];
}

/** World-space corners (TL, TR, BR, BL) of a transformed plane. */
export function planeCorners(o: PlaneOpts): V3[] {
  const s = o.scale ?? 1;
  const [ax, ay] = o.anchor ?? [0.5, 0.5];
  const R = rotation(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  const local: V3[] = [
    [-ax * o.w, -ay * o.h, 0],
    [(1 - ax) * o.w, -ay * o.h, 0],
    [(1 - ax) * o.w, (1 - ay) * o.h, 0],
    [-ax * o.w, (1 - ay) * o.h, 0],
  ];
  return local.map((p) => {
    const r = apply(R, [p[0] * s, p[1] * s, p[2] * s]);
    return [r[0] + (o.x ?? 0), r[1] + (o.y ?? 0), r[2] + (o.z ?? 0)] as V3;
  });
}
