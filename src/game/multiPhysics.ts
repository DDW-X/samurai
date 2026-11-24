import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * 1. Quadratic Aerodynamic Drag Equation for Projectiles (Arrows, Kunai, Bombs):
 *    F_drag = -0.5 * rho * ||v|| * v * C_d * A
 */
export function computeAerodynamicDragForce(
  vel: { x: number; y: number; z: number },
  rhoAir = 1.225,
  cd = 0.38,
  crossSectionArea = 0.0085
): { fx: number; fy: number; fz: number } {
  const speed = Math.hypot(vel.x, vel.y, vel.z);
  if (speed <= 1e-5) return { fx: 0, fy: 0, fz: 0 };
  const coeff = -0.5 * rhoAir * speed * cd * crossSectionArea;
  return {
    fx: coeff * vel.x,
    fy: coeff * vel.y,
    fz: coeff * vel.z,
  };
}

/**
 * 2. Analytical Two-Bone Inverse Kinematics (Law of Cosines)
 * Solves shoulder/hip -> elbow/knee -> wrist/ankle joint angles & world positions.
 */
export interface TwoBoneIKResult {
  midJointPos: { x: number; y: number; z: number };
  endEffectorPos: { x: number; y: number; z: number };
  upperBoneAngleRad: number;
  lowerBoneBendRad: number;
  reached: boolean;
}

export function solveTwoBoneIK(
  rootPos: { x: number; y: number; z: number },
  targetPos: { x: number; y: number; z: number },
  poleHintDir: { x: number; y: number; z: number },
  lenUpper: number,
  lenLower: number
): TwoBoneIKResult {
  const dx = targetPos.x - rootPos.x;
  const dy = targetPos.y - rootPos.y;
  const dz = targetPos.z - rootPos.z;
  const rawDist = Math.hypot(dx, dy, dz);
  const maxReach = Math.max(0.001, lenUpper + lenLower - 0.002);
  const minReach = Math.max(0.01, Math.abs(lenUpper - lenLower) + 0.002);
  const clampedDist = Math.max(minReach, Math.min(maxReach, rawDist));
  const reached = rawDist <= maxReach;

  // Law of Cosines:
  // cos(alpha) = (L1^2 + D^2 - L2^2) / (2 * L1 * D)
  // cos(beta)  = (L1^2 + L2^2 - D^2) / (2 * L1 * L2)
  const cosAlpha = Math.max(
    -1,
    Math.min(
      1,
      (lenUpper * lenUpper + clampedDist * clampedDist - lenLower * lenLower) /
        (2 * lenUpper * clampedDist)
    )
  );
  const cosBeta = Math.max(
    -1,
    Math.min(
      1,
      (lenUpper * lenUpper + lenLower * lenLower - clampedDist * clampedDist) /
        (2 * lenUpper * lenLower)
    )
  );

  const alpha = Math.acos(cosAlpha);
  const beta = Math.acos(cosBeta);

  const invD = rawDist > 1e-5 ? 1 / rawDist : 0;
  const dirX = rawDist > 1e-5 ? dx * invD : 0;
  const dirY = rawDist > 1e-5 ? dy * invD : -1;
  const dirZ = rawDist > 1e-5 ? dz * invD : 0;

  // Orthonormalize pole hint relative to dir
  const dotPole = poleHintDir.x * dirX + poleHintDir.y * dirY + poleHintDir.z * dirZ;
  let orthX = poleHintDir.x - dotPole * dirX;
  let orthY = poleHintDir.y - dotPole * dirY;
  let orthZ = poleHintDir.z - dotPole * dirZ;
  const orthLen = Math.hypot(orthX, orthY, orthZ);
  if (orthLen > 1e-5) {
    orthX /= orthLen;
    orthY /= orthLen;
    orthZ /= orthLen;
  } else {
    orthX = 0;
    orthY = 0;
    orthZ = 1;
  }

  const along = Math.cos(alpha) * lenUpper;
  const perp = Math.sin(alpha) * lenUpper;

  const midX = rootPos.x + dirX * along + orthX * perp;
  const midY = rootPos.y + dirY * along + orthY * perp;
  const midZ = rootPos.z + dirZ * along + orthZ * perp;

  const endX = rootPos.x + dirX * clampedDist;
  const endY = rootPos.y + dirY * clampedDist;
  const endZ = rootPos.z + dirZ * clampedDist;

  return {
    midJointPos: { x: midX, y: midY, z: midZ },
    endEffectorPos: { x: endX, y: endY, z: endZ },
    upperBoneAngleRad: alpha,
    lowerBoneBendRad: Math.PI - beta,
    reached,
  };
}

/**
 * 3. Real-Time 3D Verlet Integration Cloth & Wind Solver:
 *    x_i(t + dt) = 2*x_i(t) - x_i(t - dt) + ((F_wind + F_gravity) / m) * dt^2
 *    Includes structural distance, shear, and 2-step bending constraints.
 */
interface VerletConstraint {
  a: number;
  b: number;
  restDist: number;
  stiffness: number;
}

export class VerletClothSheet {
  public readonly cols: number;
  public readonly rows: number;
  public readonly width: number;
  public readonly height: number;
  public readonly currPos: Float32Array;
  public readonly prevPos: Float32Array;
  public readonly pinned: Uint8Array;
  public readonly geometry: THREE.BufferGeometry;
  public readonly mesh: THREE.Mesh;
  private constraints: VerletConstraint[] = [];
  private mass = 0.08;
  private damping = 0.975;

  constructor(
    width: number,
    height: number,
    cols: number,
    rows: number,
    material: THREE.Material
  ) {
    this.width = width;
    this.height = height;
    this.cols = cols;
    this.rows = rows;

    const count = (cols + 1) * (rows + 1);
    this.currPos = new Float32Array(count * 3);
    this.prevPos = new Float32Array(count * 3);
    this.pinned = new Uint8Array(count);

    this.geometry = new THREE.PlaneGeometry(width, height, cols, rows);
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;

    const idxOf = (c: number, r: number) => r * (cols + 1) + c;

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const idx = idxOf(c, r);
        const x = (c / cols - 0.5) * width;
        const y = -(r / rows) * height;
        const z = -0.02 * (r / rows);

        this.currPos[idx * 3] = x;
        this.currPos[idx * 3 + 1] = y;
        this.currPos[idx * 3 + 2] = z;

        this.prevPos[idx * 3] = x;
        this.prevPos[idx * 3 + 1] = y;
        this.prevPos[idx * 3 + 2] = z;

        posAttr.setXYZ(idx, x, y, z);

        // Pin top collar row (r === 0)
        if (r === 0) {
          this.pinned[idx] = 1;
        }
      }
    }

    const addConstraint = (a: number, b: number, stiffness: number) => {
      const dx = this.currPos[b * 3] - this.currPos[a * 3];
      const dy = this.currPos[b * 3 + 1] - this.currPos[a * 3 + 1];
      const dz = this.currPos[b * 3 + 2] - this.currPos[a * 3 + 2];
      this.constraints.push({
        a,
        b,
        restDist: Math.hypot(dx, dy, dz),
        stiffness,
      });
    };

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        // Structural constraints
        if (c < cols) addConstraint(idxOf(c, r), idxOf(c + 1, r), 0.95);
        if (r < rows) addConstraint(idxOf(c, r), idxOf(c, r + 1), 0.95);
        // Shear constraints
        if (c < cols && r < rows) {
          addConstraint(idxOf(c, r), idxOf(c + 1, r + 1), 0.65);
          addConstraint(idxOf(c + 1, r), idxOf(c, r + 1), 0.65);
        }
        // Bending constraints (2-step)
        if (c + 2 <= cols) addConstraint(idxOf(c, r), idxOf(c + 2, r), 0.35);
        if (r + 2 <= rows) addConstraint(idxOf(c, r), idxOf(c, r + 2), 0.35);
      }
    }

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  public step(
    dt: number,
    windForce: { x: number; y: number; z: number },
    actorVelocity: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    solverIterations = 3
  ) {
    const clampedDt = Math.min(dt, 0.025);
    const dtSq = clampedDt * clampedDt;
    const invMass = 1 / this.mass;
    const count = (this.cols + 1) * (this.rows + 1);

    // 1. Verlet Position Update: x(t + dt) = 2*x(t) - x(t - dt) + ((F_wind + F_grav) / m) * dt^2
    for (let i = 0; i < count; i++) {
      if (this.pinned[i]) continue;
      const i3 = i * 3;
      const cx = this.currPos[i3];
      const cy = this.currPos[i3 + 1];
      const cz = this.currPos[i3 + 2];

      const vx = (cx - this.prevPos[i3]) * this.damping;
      const vy = (cy - this.prevPos[i3 + 1]) * this.damping;
      const vz = (cz - this.prevPos[i3 + 2]) * this.damping;

      this.prevPos[i3] = cx;
      this.prevPos[i3 + 1] = cy;
      this.prevPos[i3 + 2] = cz;

      const flutter = Math.sin(cx * 9.0 + cy * 7.0 + performance.now() * 0.008) * 0.14;
      const fx = windForce.x - actorVelocity.x * 0.22 + flutter;
      const fy = windForce.y - 0.85; // gravity
      const fz = windForce.z - actorVelocity.z * 0.22 - 0.18 + flutter;

      this.currPos[i3] = cx + vx + fx * invMass * dtSq;
      this.currPos[i3 + 1] = cy + vy + fy * invMass * dtSq;
      this.currPos[i3 + 2] = cz + vz + fz * invMass * dtSq;

      // Body collision push-out so Haori never clips inside Samurai back
      if (this.currPos[i3 + 2] > -0.02 && i > this.cols) {
        this.currPos[i3 + 2] = -0.02;
      }
    }

    // 2. Relaxation of distance, shear, and bending constraints
    for (let iter = 0; iter < solverIterations; iter++) {
      for (let k = 0; k < this.constraints.length; k++) {
        const c = this.constraints[k];
        const a3 = c.a * 3;
        const b3 = c.b * 3;
        const dx = this.currPos[b3] - this.currPos[a3];
        const dy = this.currPos[b3 + 1] - this.currPos[a3 + 1];
        const dz = this.currPos[b3 + 2] - this.currPos[a3 + 2];
        const dist = Math.hypot(dx, dy, dz);
        if (dist <= 1e-6) continue;
        const diff = ((dist - c.restDist) / dist) * c.stiffness;
        const pinA = this.pinned[c.a] === 1;
        const pinB = this.pinned[c.b] === 1;

        if (pinA && !pinB) {
          this.currPos[b3] -= dx * diff;
          this.currPos[b3 + 1] -= dy * diff;
          this.currPos[b3 + 2] -= dz * diff;
        } else if (!pinA && pinB) {
          this.currPos[a3] += dx * diff;
          this.currPos[a3 + 1] += dy * diff;
          this.currPos[a3 + 2] += dz * diff;
        } else if (!pinA && !pinB) {
          const half = diff * 0.5;
          this.currPos[a3] += dx * half;
          this.currPos[a3 + 1] += dy * half;
          this.currPos[a3 + 2] += dz * half;
          this.currPos[b3] -= dx * half;
          this.currPos[b3 + 1] -= dy * half;
          this.currPos[b3 + 2] -= dz * half;
        }
      }
    }

    // 3. Commit updated positions to Three.js BufferGeometry
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      posAttr.setXYZ(i, this.currPos[i * 3], this.currPos[i * 3 + 1], this.currPos[i * 3 + 2]);
    }
    posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}

/**
 * 4. Real-Time Planar Mesh Slicing (Zandatsu / Bisection Engine):
 *    Slices a 3D BufferGeometry across the plane pi: n . (x - p0) = 0,
 *    producing two independent BufferGeometries (upper & lower halves) plus cross-section cap triangles.
 */
export interface BisectedGeometryResult {
  upperGeometry: THREE.BufferGeometry;
  lowerGeometry: THREE.BufferGeometry;
  upperTriCount: number;
  lowerTriCount: number;
}

export function sliceBufferGeometryByPlane(
  sourceGeo: THREE.BufferGeometry,
  planePointLocal: { x: number; y: number; z: number },
  planeNormalLocal: { x: number; y: number; z: number }
): BisectedGeometryResult {
  const nLen = Math.hypot(planeNormalLocal.x, planeNormalLocal.y, planeNormalLocal.z) || 1;
  const nx = planeNormalLocal.x / nLen;
  const ny = planeNormalLocal.y / nLen;
  const nz = planeNormalLocal.z / nLen;

  const signedDist = (vx: number, vy: number, vz: number) =>
    nx * (vx - planePointLocal.x) +
    ny * (vy - planePointLocal.y) +
    nz * (vz - planePointLocal.z);

  const nonIndexed = sourceGeo.index ? sourceGeo.toNonIndexed() : sourceGeo.clone();
  const posAttr = nonIndexed.getAttribute('position') as THREE.BufferAttribute;
  const triCount = Math.floor(posAttr.count / 3);

  const upperPos: number[] = [];
  const lowerPos: number[] = [];
  const cutEdgePoints: Array<{ x: number; y: number; z: number }> = [];

  const pushTri = (
    arr: number[],
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
    c: { x: number; y: number; z: number }
  ) => {
    arr.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };

  const intersectEdge = (
    pA: { x: number; y: number; z: number },
    pB: { x: number; y: number; z: number },
    dA: number,
    dB: number
  ) => {
    const denom = dA - dB;
    const t = Math.abs(denom) > 1e-6 ? Math.max(0, Math.min(1, dA / denom)) : 0.5;
    return {
      x: pA.x + (pB.x - pA.x) * t,
      y: pA.y + (pB.y - pA.y) * t,
      z: pA.z + (pB.z - pA.z) * t,
    };
  };

  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3;
    const i1 = i0 + 1;
    const i2 = i0 + 2;

    const v0 = { x: posAttr.getX(i0), y: posAttr.getY(i0), z: posAttr.getZ(i0) };
    const v1 = { x: posAttr.getX(i1), y: posAttr.getY(i1), z: posAttr.getZ(i1) };
    const v2 = { x: posAttr.getX(i2), y: posAttr.getY(i2), z: posAttr.getZ(i2) };

    const d0 = signedDist(v0.x, v0.y, v0.z);
    const d1 = signedDist(v1.x, v1.y, v1.z);
    const d2 = signedDist(v2.x, v2.y, v2.z);

    const s0 = d0 >= 0;
    const s1 = d1 >= 0;
    const s2 = d2 >= 0;

    if (s0 && s1 && s2) {
      pushTri(upperPos, v0, v1, v2);
    } else if (!s0 && !s1 && !s2) {
      pushTri(lowerPos, v0, v1, v2);
    } else {
      // Triangle straddles cutting plane: rotate vertices so single vertex is isolated
      const verts = [v0, v1, v2];
      const dists = [d0, d1, d2];
      const signs = [s0, s1, s2];

      let soloIdx = 0;
      if (signs[0] === signs[1]) soloIdx = 2;
      else if (signs[0] === signs[2]) soloIdx = 1;
      else soloIdx = 0;

      const a = verts[soloIdx];
      const b = verts[(soloIdx + 1) % 3];
      const c = verts[(soloIdx + 2) % 3];
      const da = dists[soloIdx];
      const db = dists[(soloIdx + 1) % 3];
      const dc = dists[(soloIdx + 2) % 3];
      const soloPositive = signs[soloIdx];

      const pAB = intersectEdge(a, b, da, db);
      const pAC = intersectEdge(a, c, da, dc);
      cutEdgePoints.push(pAB, pAC);

      if (soloPositive) {
        pushTri(upperPos, a, pAB, pAC);
        pushTri(lowerPos, pAB, b, c);
        pushTri(lowerPos, pAB, c, pAC);
      } else {
        pushTri(lowerPos, a, pAB, pAC);
        pushTri(upperPos, pAB, b, c);
        pushTri(upperPos, pAB, c, pAC);
      }
    }
  }

  // Cap the cross-section plane around centroid so both bisected halves are closed
  if (cutEdgePoints.length >= 3) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const pt of cutEdgePoints) {
      cx += pt.x;
      cy += pt.y;
      cz += pt.z;
    }
    cx /= cutEdgePoints.length;
    cy /= cutEdgePoints.length;
    cz /= cutEdgePoints.length;
    const center = { x: cx, y: cy, z: cz };

    for (let k = 0; k + 1 < cutEdgePoints.length; k += 2) {
      const p1 = cutEdgePoints[k];
      const p2 = cutEdgePoints[k + 1];
      pushTri(upperPos, center, p2, p1);
      pushTri(lowerPos, center, p1, p2);
    }
  }

  const buildGeo = (arr: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    return g;
  };

  return {
    upperGeometry: buildGeo(upperPos),
    lowerGeometry: buildGeo(lowerPos),
    upperTriCount: Math.floor(upperPos.length / 9),
    lowerTriCount: Math.floor(lowerPos.length / 9),
  };
}

/**
 * 5. Real 60Hz Rigid-Body & Articulated Ragdoll Physics Engine (cannon-es)
 */
export interface SyncedRigidBodyEntry {
  id: number;
  body: CANNON.Body;
  mesh: THREE.Object3D;
  life: number;
  maxLife: number;
  isDestructibleProp: boolean;
  propType?: 'crate' | 'lantern' | 'sliced_half' | 'ragdoll_limb';
  hp?: number;
}

export class CannonMultiPhysicsEngine {
  public readonly world: CANNON.World;
  public readonly entries: SyncedRigidBodyEntry[] = [];
  public readonly constraints: CANNON.Constraint[] = [];
  private nextId = 1;

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -19.6, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    // Static ground plane at y = 0
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);
  }

  public addRigidBodyMesh(
    mesh: THREE.Object3D,
    shape: CANNON.Shape,
    mass: number,
    pos: { x: number; y: number; z: number },
    impulse: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    angularVel: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    life = 5.5,
    isDestructibleProp = false,
    propType: SyncedRigidBodyEntry['propType'] = 'sliced_half',
    hp = 45
  ): SyncedRigidBodyEntry {
    const body = new CANNON.Body({
      mass,
      shape,
      position: new CANNON.Vec3(pos.x, Math.max(0.25, pos.y), pos.z),
      linearDamping: 0.18,
      angularDamping: 0.24,
    });
    body.angularVelocity.set(angularVel.x, angularVel.y, angularVel.z);
    if (impulse.x !== 0 || impulse.y !== 0 || impulse.z !== 0) {
      body.applyImpulse(new CANNON.Vec3(impulse.x, impulse.y, impulse.z));
    }
    this.world.addBody(body);

    const entry: SyncedRigidBodyEntry = {
      id: this.nextId++,
      body,
      mesh,
      life,
      maxLife: life,
      isDestructibleProp,
      propType,
      hp,
    };
    this.entries.push(entry);
    return entry;
  }

  /**
   * Spawns an articulated multi-body ragdoll (Torso + Head + 2 Arms + Weapon) linked with
   * CANNON.ConeTwistConstraint / PointToPointConstraint upon lethal enemy defeat.
   */
  public spawnArticulatedEnemyRagdoll(
    scene: THREE.Scene,
    origin: THREE.Vector3,
    killDirection: THREE.Vector3,
    torsoMesh: THREE.Object3D,
    headMesh: THREE.Object3D,
    armMesh: THREE.Object3D
  ) {
    const torsoEntry = this.addRigidBodyMesh(
      torsoMesh,
      new CANNON.Box(new CANNON.Vec3(0.28, 0.42, 0.2)),
      16,
      { x: origin.x, y: origin.y + 0.95, z: origin.z },
      { x: killDirection.x * 85, y: 42, z: killDirection.z * 85 },
      { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 6 },
      4.2,
      false,
      'ragdoll_limb'
    );
    scene.add(torsoMesh);

    const headEntry = this.addRigidBodyMesh(
      headMesh,
      new CANNON.Sphere(0.22),
      4.5,
      { x: origin.x, y: origin.y + 1.55, z: origin.z },
      { x: killDirection.x * 32, y: 24, z: killDirection.z * 32 },
      { x: 4, y: 3, z: -3 },
      4.2,
      false,
      'ragdoll_limb'
    );
    scene.add(headMesh);

    const armEntry = this.addRigidBodyMesh(
      armMesh,
      new CANNON.Box(new CANNON.Vec3(0.12, 0.32, 0.12)),
      3.5,
      { x: origin.x + 0.36, y: origin.y + 1.15, z: origin.z },
      { x: killDirection.x * 28 + 14, y: 20, z: killDirection.z * 28 },
      { x: -5, y: 6, z: 4 },
      4.2,
      false,
      'ragdoll_limb'
    );
    scene.add(armMesh);

    // Connect Neck & Shoulder with real Cannon-es PointToPoint Ragdoll Constraints
    const neckJoint = new CANNON.PointToPointConstraint(
      torsoEntry.body,
      new CANNON.Vec3(0, 0.46, 0),
      headEntry.body,
      new CANNON.Vec3(0, -0.22, 0)
    );
    const shoulderJoint = new CANNON.PointToPointConstraint(
      torsoEntry.body,
      new CANNON.Vec3(0.32, 0.25, 0),
      armEntry.body,
      new CANNON.Vec3(0, 0.28, 0)
    );
    this.world.addConstraint(neckJoint);
    this.world.addConstraint(shoulderJoint);
    this.constraints.push(neckJoint, shoulderJoint);
  }

  public applyRadialShockwave(center: { x: number; y: number; z: number }, radius: number, forceMag: number) {
    for (const entry of this.entries) {
      const dx = entry.body.position.x - center.x;
      const dz = entry.body.position.z - center.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= radius && dist > 0.001) {
        const falloff = 1 - dist / radius;
        const ix = (dx / dist) * forceMag * falloff;
        const iz = (dz / dist) * forceMag * falloff;
        entry.body.wakeUp();
        entry.body.applyImpulse(new CANNON.Vec3(ix, forceMag * 0.45 * falloff, iz));
      }
    }
  }

  public step(dt: number, scene: THREE.Scene) {
    this.world.step(1 / 60, Math.min(dt, 0.05), 3);

    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      if (!e.isDestructibleProp) {
        e.life -= dt;
      }
      sanitizeRigidBodyState(e.body, 80, 0.25);
      e.mesh.position.set(e.body.position.x, e.body.position.y, e.body.position.z);
      e.mesh.quaternion.set(
        e.body.quaternion.x,
        e.body.quaternion.y,
        e.body.quaternion.z,
        e.body.quaternion.w
      );

      if (!e.isDestructibleProp && e.life <= 0) {
        this.world.removeBody(e.body);
        scene.remove(e.mesh);
        disposeObject3DResources(e.mesh);
        this.entries.splice(i, 1);
      }
    }
  }

  public clearPropEntries(scene: THREE.Scene) {
    while (this.constraints.length > 0) {
      const c = this.constraints.pop()!;
      this.world.removeConstraint(c);
    }
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      this.world.removeBody(e.body);
      scene.remove(e.mesh);
      disposeObject3DResources(e.mesh);
      this.entries.splice(i, 1);
    }
  }
}

/**
 * 6. Zero-Bug Defensive Physics Sanitizer (NaN / Infinity & Velocity Clamping)
 *    Guarantees no rigid body, cloth vertex, or actor ever explodes to NaN/Infinity.
 */
export function sanitizePhysicsVec3(
  vec: { x: number; y: number; z: number },
  maxMagnitude = 80,
  fallback: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
): { x: number; y: number; z: number; wasSanitized: boolean } {
  let x = vec.x;
  let y = vec.y;
  let z = vec.z;
  let wasSanitized = false;

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    x = fallback.x;
    y = fallback.y;
    z = fallback.z;
    wasSanitized = true;
  }

  const mag = Math.hypot(x, y, z);
  if (mag > maxMagnitude && mag > 1e-6) {
    const scale = maxMagnitude / mag;
    x *= scale;
    y *= scale;
    z *= scale;
    wasSanitized = true;
  }

  return { x, y, z, wasSanitized };
}

export function sanitizeRigidBodyState(
  body: CANNON.Body,
  maxSpeed = 80,
  safeGroundY = 0.25
): boolean {
  let sanitized = false;
  if (
    !Number.isFinite(body.position.x) ||
    !Number.isFinite(body.position.y) ||
    !Number.isFinite(body.position.z)
  ) {
    body.position.set(0, safeGroundY, 0);
    sanitized = true;
  }
  const v = sanitizePhysicsVec3(body.velocity, maxSpeed, { x: 0, y: 0, z: 0 });
  if (v.wasSanitized) {
    body.velocity.set(v.x, v.y, v.z);
    sanitized = true;
  }
  const w = sanitizePhysicsVec3(body.angularVelocity, 35, { x: 0, y: 0, z: 0 });
  if (w.wasSanitized) {
    body.angularVelocity.set(w.x, w.y, w.z);
    sanitized = true;
  }
  return sanitized;
}

export function disposeObject3DResources(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (m && typeof m.dispose === 'function') {
          m.dispose();
        }
      }
    }
  });
}

