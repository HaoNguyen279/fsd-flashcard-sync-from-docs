import * as THREE from "three";
import { RunnerConfig } from "../types";

export class Obstacle {
  public group: THREE.Group;
  private barriers: THREE.Group[] = [];
  private gatePads: THREE.Mesh[] = [];
  private padGeometry: THREE.PlaneGeometry;
  private padMaterials: THREE.MeshBasicMaterial[] = [];

  constructor(
    scene: THREE.Scene,
    boxGeometry: THREE.BoxGeometry,
    sphereGeometry: THREE.IcosahedronGeometry,
    getMaterial: (color: number, roughness?: number) => THREE.MeshStandardMaterial,
    config: RunnerConfig
  ) {
    this.group = new THREE.Group();

    const addBox = (
      parent: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: number,
      castShadow = false
    ) => {
      const mesh = new THREE.Mesh(boxGeometry, getMaterial(color));
      mesh.position.set(x, y, z);
      mesh.scale.set(w, h, d);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const addLowPoly = (
      parent: THREE.Object3D,
      geometry: THREE.BufferGeometry,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      color: number
    ) => {
      const mesh = new THREE.Mesh(geometry, getMaterial(color));
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      parent.add(mesh);
      return mesh;
    };

    this.padGeometry = new THREE.PlaneGeometry(2.8, 2.4);

    for (let i = 0; i < 4; i++) {
      const barrier = new THREE.Group();
      barrier.position.x = config.lanes[i];

      addBox(barrier, -1.14, 0.59, 0, 0.15, 1.18, 0.2, 0x465560);
      addBox(barrier, 1.14, 0.59, 0, 0.15, 1.18, 0.2, 0x465560);
      addBox(barrier, -1.14, 0.09, 0, 0.5, 0.18, 0.58, 0x465560);
      addBox(barrier, 1.14, 0.09, 0, 0.5, 0.18, 0.58, 0x465560);
      addBox(barrier, 0, 0.93, 0, 2.83, 0.58, 0.25, 0xffab5a, true);
      addBox(barrier, 0, 0.91, 0.137, 2.78, 0.05, 0.035, 0xffd49b);

      for (const x of [-0.94, -0.31, 0.32, 0.95]) {
        const stripe = addBox(barrier, x, 0.94, 0.15, 0.25, 0.54, 0.02, 0x4e4540);
        stripe.rotation.z = -0.42;
      }

      for (const x of [-1.16, 1.16]) {
        addLowPoly(barrier, sphereGeometry, x, 1.38, 0, 0.11, 0.13, 0.11, 0xffdd7f);
      }

      this.group.add(barrier);
      this.barriers.push(barrier);

      const padMaterial = new THREE.MeshBasicMaterial({
        color: 0xffbb72,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      });
      this.padMaterials.push(padMaterial);

      const pad = new THREE.Mesh(this.padGeometry, padMaterial);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(config.lanes[i], 0.05, -0.15);
      this.group.add(pad);
      this.gatePads.push(pad);
    }

    this.group.visible = false;
    scene.add(this.group);
  }

  public resetQuestion(startZ: number): void {
    this.group.position.z = startZ;
    this.group.visible = true;
    for (const barrier of this.barriers) {
      barrier.visible = true;
      barrier.position.y = 0;
      barrier.rotation.set(0, 0, 0);
    }
  }

  public openGate(correctIndex: number): void {
    if (this.barriers[correctIndex]) {
      this.barriers[correctIndex].position.y = 3.5;
      this.barriers[correctIndex].visible = false;
    }
  }

  public freezeCrash(carZ: number): void {
    this.group.position.z = carZ - 0.9;
  }

  public updatePadHighlight(currentLane: number): void {
    for (let i = 0; i < this.gatePads.length; i++) {
      this.padMaterials[i].opacity = i === currentLane ? 0.2 : 0.08;
    }
  }

  public destroy(scene: THREE.Scene): void {
    scene.remove(this.group);
    this.padGeometry.dispose();
    for (const mat of this.padMaterials) {
      mat.dispose();
    }
  }
}
