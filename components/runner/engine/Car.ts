import * as THREE from "three";
import { RunnerConfig, GameState } from "../types";

export class Car {
  public group: THREE.Group;
  public model: THREE.Group;
  private wheels: THREE.Group[] = [];
  private shadow: THREE.Mesh;
  private wheelGeometry: THREE.CylinderGeometry;
  private hubGeometry: THREE.CylinderGeometry;
  private shadowGeometry: THREE.CircleGeometry;
  private shadowMaterial: THREE.MeshBasicMaterial;

  constructor(
    scene: THREE.Scene,
    boxGeometry: THREE.BoxGeometry,
    getMaterial: (color: number, roughness?: number) => THREE.MeshStandardMaterial,
    initialX: number,
    carZ: number
  ) {
    this.group = new THREE.Group();
    this.model = new THREE.Group();
    this.group.add(this.model);
    this.group.position.set(initialX, 0.04, carZ);

    const addBox = (
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
      this.model.add(mesh);
      return mesh;
    };

    // Chassis and body parts matching prototype
    addBox(0, 0.55, 0, 1.52, 0.54, 2.55, 0xf37365, true);
    addBox(0, 0.81, -0.69, 1.45, 0.17, 0.96, 0xff967c, true);
    addBox(0, 0.39, 1.16, 1.55, 0.19, 0.22, 0x263944);
    addBox(0, 0.39, -1.23, 1.55, 0.16, 0.2, 0x263944);
    addBox(0, 1.02, 0.16, 1.27, 0.54, 1.19, 0xf9b59b, true);
    addBox(0, 1.15, -0.47, 1.14, 0.34, 0.045, 0x264e62);
    addBox(0, 1.15, 0.77, 1.14, 0.31, 0.045, 0x31596a);
    addBox(-0.645, 1.14, 0.15, 0.025, 0.31, 1.04, 0x31596a);
    addBox(0.645, 1.14, 0.15, 0.025, 0.31, 1.04, 0x31596a);
    addBox(0, 1.34, 0.16, 1.35, 0.13, 1.32, 0xff9279, true);
    addBox(0, 0.835, -0.72, 0.22, 0.018, 0.95, 0xffd7b4);
    addBox(-0.48, 0.6, -1.292, 0.34, 0.16, 0.035, 0xfff4bd);
    addBox(0.48, 0.6, -1.292, 0.34, 0.16, 0.035, 0xfff4bd);
    addBox(-0.52, 0.63, 1.292, 0.25, 0.13, 0.035, 0xff353e);
    addBox(0.52, 0.63, 1.292, 0.25, 0.13, 0.035, 0xff353e);
    addBox(-0.82, 0.95, -0.13, 0.18, 0.1, 0.23, 0xf37365);
    addBox(0.82, 0.95, -0.13, 0.18, 0.1, 0.23, 0xf37365);

    // Wheels
    this.wheelGeometry = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 12);
    this.hubGeometry = new THREE.CylinderGeometry(0.16, 0.16, 0.215, 8);

    for (const x of [-0.79, 0.79]) {
      for (const z of [-0.78, 0.79]) {
        const wheel = new THREE.Group();
        wheel.position.set(x, 0.33, z);
        const tire = new THREE.Mesh(this.wheelGeometry, getMaterial(0x202b35));
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        const hub = new THREE.Mesh(this.hubGeometry, getMaterial(0xb9d1d8, 0.45));
        hub.rotation.z = Math.PI / 2;
        wheel.add(tire, hub);
        this.model.add(wheel);
        this.wheels.push(wheel);
      }
    }

    // Shadow
    this.shadowGeometry = new THREE.CircleGeometry(1, 24);
    this.shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x162d30,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    this.shadow = new THREE.Mesh(this.shadowGeometry, this.shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.scale.set(0.92, 1.62, 1);
    this.shadow.position.y = 0.025;
    this.group.add(this.shadow);

    scene.add(this.group);
  }

  public reset(x: number, carZ: number): void {
    this.group.position.set(x, 0.04, carZ);
    this.model.rotation.set(0, 0, 0);
    this.model.position.set(0, 0, 0);
  }

  public update(
    dt: number,
    targetX: number,
    speed: number,
    running: boolean,
    state: GameState,
    stateElapsed: number,
    animationTime: number,
    bounce: number,
    reducedMotion: boolean,
    config: RunnerConfig
  ): void {
    if (running) {
      const difference = targetX - this.group.position.x;
      this.group.position.x += difference * (1 - Math.exp(-config.laneSmoothing * dt));

      const targetRoll = reducedMotion ? 0 : -difference * 0.045;
      const targetYaw = difference * -0.055;

      this.model.rotation.z = THREE.MathUtils.damp(this.model.rotation.z, targetRoll, 10, dt);
      this.model.rotation.y = THREE.MathUtils.damp(this.model.rotation.y, targetYaw, 10, dt);
      this.model.rotation.x = THREE.MathUtils.damp(this.model.rotation.x, 0, 10, dt);

      this.group.position.y =
        0.04 +
        (reducedMotion
          ? 0
          : Math.abs(Math.sin(animationTime * 5)) * 0.017 + Math.sin(bounce * Math.PI) * 0.16);

      for (const wheel of this.wheels) {
        wheel.rotation.x -= (speed * dt) / 0.32;
      }
    } else if (state === "CRASH") {
      const progress = Math.min(1, stateElapsed / config.crashDuration);
      this.model.rotation.z = THREE.MathUtils.damp(this.model.rotation.z, -0.33, 6, dt);
      this.model.rotation.y = THREE.MathUtils.damp(this.model.rotation.y, 0.32, 5, dt);
      this.model.rotation.x = THREE.MathUtils.damp(this.model.rotation.x, -0.12, 5, dt);
      this.model.position.x = reducedMotion
        ? 0
        : Math.sin(stateElapsed * 55) * 0.14 * (1 - progress);
      this.group.position.y = 0.04 + Math.sin(progress * Math.PI) * 0.14;

      for (const wheel of this.wheels) {
        wheel.rotation.x -= (speed * dt * (1 - progress)) / 0.32;
      }
    } else if (state === "START") {
      this.model.rotation.z = 0;
    }
  }

  public destroy(scene: THREE.Scene): void {
    scene.remove(this.group);
    this.wheelGeometry.dispose();
    this.hubGeometry.dispose();
    this.shadowGeometry.dispose();
    this.shadowMaterial.dispose();
  }
}
