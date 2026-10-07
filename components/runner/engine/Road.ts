import * as THREE from "three";
import { RunnerConfig } from "../types";

export class Road {
  private staticElements: THREE.Mesh[] = [];
  private laneDashes: THREE.Mesh[] = [];
  private roadsidePosts: THREE.Group[] = [];
  public laneGlow: THREE.Mesh;
  private glowGeometry: THREE.PlaneGeometry;
  private glowMaterial: THREE.MeshBasicMaterial;

  constructor(
    scene: THREE.Scene,
    boxGeometry: THREE.BoxGeometry,
    getMaterial: (color: number, roughness?: number) => THREE.MeshStandardMaterial,
    config: RunnerConfig,
    initialLane: number
  ) {
    const addBox = (
      parent: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: number
    ) => {
      const mesh = new THREE.Mesh(boxGeometry, getMaterial(color));
      mesh.position.set(x, y, z);
      mesh.scale.set(w, h, d);
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Ground and asphalt
    const ground = addBox(scene, 0, -0.2, -105, 420, 0.3, 310, 0x8abf87);
    this.staticElements.push(ground);

    const roadSurface = addBox(scene, 0, -0.035, -104, config.roadWidth, 0.11, 280, 0x35434b);
    this.staticElements.push(roadSurface);

    this.staticElements.push(addBox(scene, -6.19, 0.01, -104, 0.3, 0.13, 280, 0xd8dacd));
    this.staticElements.push(addBox(scene, 6.19, 0.01, -104, 0.3, 0.13, 280, 0xd8dacd));
    this.staticElements.push(addBox(scene, -5.84, 0.028, -104, 0.1, 0.012, 280, 0xffefc4));
    this.staticElements.push(addBox(scene, 5.84, 0.028, -104, 0.1, 0.012, 280, 0xffefc4));

    // Dashed center markings
    for (let z = -226; z < 24; z += 7) {
      for (const x of [-3, 0, 3]) {
        const dash = addBox(scene, x, 0.03, z, 0.09, 0.018, 3.25, 0xe7eee7);
        this.laneDashes.push(dash);
      }
    }

    // Roadside reflector posts
    for (let z = -220; z < 20; z += 12) {
      for (const side of [-1, 1]) {
        const post = new THREE.Group();
        post.position.set(side * 6.85, 0, z);
        addBox(post, 0, 0.43, 0, 0.11, 0.86, 0.14, 0xe9eee5);
        addBox(post, 0, 0.68, -0.082, 0.12, 0.18, 0.028, 0xffa563);
        scene.add(post);
        this.roadsidePosts.push(post);
      }
    }

    // Lane indicator glow
    this.glowGeometry = new THREE.PlaneGeometry(2.45, 7);
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x8df0c8,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    this.laneGlow = new THREE.Mesh(this.glowGeometry, this.glowMaterial);
    this.laneGlow.rotation.x = -Math.PI / 2;
    this.laneGlow.position.set(config.lanes[initialLane], 0.045, -0.2);
    scene.add(this.laneGlow);
  }

  public move(amount: number, recycleLength: number): void {
    for (const dash of this.laneDashes) {
      dash.position.z += amount;
      if (dash.position.z > 26) {
        dash.position.z -= 252;
      }
    }

    for (const post of this.roadsidePosts) {
      post.position.z += amount;
      if (post.position.z > 25) {
        post.position.z -= recycleLength;
      }
    }
  }

  public updateGlow(targetX: number, visible: boolean, dt: number): void {
    this.laneGlow.position.x = THREE.MathUtils.damp(this.laneGlow.position.x, targetX, 9, dt);
    this.laneGlow.visible = visible;
  }

  public reset(initialX: number): void {
    this.laneGlow.position.x = initialX;
  }

  public destroy(scene: THREE.Scene): void {
    for (const el of this.staticElements) {
      scene.remove(el);
    }
    for (const dash of this.laneDashes) {
      scene.remove(dash);
    }
    for (const post of this.roadsidePosts) {
      scene.remove(post);
    }
    scene.remove(this.laneGlow);
    this.glowGeometry.dispose();
    this.glowMaterial.dispose();
  }
}
