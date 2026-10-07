import * as THREE from "three";

export class Environment {
  private scenery: THREE.Group[] = [];
  private mountains: THREE.Mesh[] = [];
  private clouds: THREE.Group[] = [];
  private cloudMaterial: THREE.MeshBasicMaterial;

  constructor(
    scene: THREE.Scene,
    boxGeometry: THREE.BoxGeometry,
    sphereGeometry: THREE.IcosahedronGeometry,
    coneGeometry: THREE.ConeGeometry,
    getMaterial: (color: number, roughness?: number) => THREE.MeshStandardMaterial
  ) {
    const random = (min: number, max: number) => min + Math.random() * (max - min);

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

    const treeColors = [0x3d9070, 0x5aaa77, 0x76b67b, 0x3c8272];
    const buildingColors = [0xe9c5a3, 0xd1d7cf, 0x98bcc2, 0xe9ad96, 0xb5bfce];

    const createTree = (): THREE.Group => {
      const group = new THREE.Group();
      const height = random(2.5, 4.5);
      addBox(group, 0, height * 0.23, 0, 0.24, height * 0.46, 0.24, 0x806854);
      const color = treeColors[Math.floor(random(0, treeColors.length))];
      addLowPoly(group, coneGeometry, 0, height * 0.64, 0, 1.22, height * 0.78, 1.22, color);
      addLowPoly(group, coneGeometry, 0, height * 0.88, 0, 0.92, height * 0.55, 0.92, color);
      return group;
    };

    const createBuilding = (): THREE.Group => {
      const group = new THREE.Group();
      const width = random(3.2, 5.5);
      const height = random(3, 9);
      const depth = random(3.5, 6);
      const color = buildingColors[Math.floor(random(0, buildingColors.length))];
      addBox(group, 0, height / 2, 0, width, height, depth, color);
      addBox(group, 0, height + 0.13, 0, width + 0.2, 0.26, depth + 0.2, 0x6b8790);
      for (let y = 1.3; y < height - 0.4; y += 1.55) {
        for (const x of [-width * 0.27, width * 0.27]) {
          addBox(group, x, y, depth / 2 + 0.012, 0.63, 0.7, 0.04, 0x526e7c);
        }
      }
      return group;
    };

    const createBush = (): THREE.Group => {
      const group = new THREE.Group();
      addLowPoly(group, sphereGeometry, 0, 0.48, 0, 1.1, 0.65, 0.8, 0x609964);
      addLowPoly(group, sphereGeometry, 0.55, 0.35, 0.1, 0.7, 0.5, 0.7, 0x75af72);
      return group;
    };

    const createStreetLight = (side: number): THREE.Group => {
      const group = new THREE.Group();
      addBox(group, 0, 2.5, 0, 0.12, 5, 0.12, 0x557780);
      addBox(group, -side * 0.65, 4.96, 0, 1.4, 0.1, 0.1, 0x557780);
      addBox(group, -side * 1.3, 4.91, 0, 0.58, 0.12, 0.3, 0xe0ebe5);
      return group;
    };

    const createSign = (): THREE.Group => {
      const group = new THREE.Group();
      addBox(group, 0, 1.05, 0, 0.1, 2.1, 0.1, 0x6b8591);
      addBox(group, 0, 1.96, 0, 1.3, 0.72, 0.12, 0xe9f3db);
      addBox(group, 0, 1.96, 0.07, 1.17, 0.59, 0.025, 0x347b72);
      addBox(group, -0.2, 1.96, 0.092, 0.55, 0.085, 0.025, 0xd2f5e3);
      const arrow = addBox(group, 0.16, 2.035, 0.093, 0.3, 0.08, 0.025, 0xd2f5e3);
      arrow.rotation.z = -0.65;
      return group;
    };

    // Scenery pool (54 objects)
    for (let i = 0; i < 54; i++) {
      const side = i % 2 ? 1 : -1;
      const type = i % 9;
      let object: THREE.Group;
      let offset: number;

      if (type === 0 || type === 5) {
        object = createBuilding();
        offset = random(16, 29);
      } else if (type === 3) {
        object = createStreetLight(side);
        offset = 8;
      } else if (type === 6) {
        object = createBush();
        offset = random(8.5, 13);
      } else if (type === 8) {
        object = createSign();
        offset = 8.5;
      } else {
        object = createTree();
        offset = random(10, 21);
      }

      object.position.set(side * offset, 0, -220 + (i / 54) * 240 + random(-3, 3));
      object.userData.side = side;
      object.userData.type = type;
      scene.add(object);
      this.scenery.push(object);
    }

    // Distant background mountain cones (12)
    for (let i = 0; i < 12; i++) {
      const mountain = addLowPoly(
        scene,
        coneGeometry,
        -115 + i * 21,
        9,
        -225 - random(0, 20),
        random(17, 27),
        random(20, 36),
        20,
        i % 2 ? 0x93bdb9 : 0xabcac2
      ) as THREE.Mesh;
      mountain.rotation.y = random(0, Math.PI);
      this.mountains.push(mountain);
    }

    // Cloud puff groups (9)
    this.cloudMaterial = new THREE.MeshBasicMaterial({
      color: 0xf2faf6,
      transparent: true,
      opacity: 0.78,
    });
    for (let i = 0; i < 9; i++) {
      const cloud = new THREE.Group();
      cloud.position.set(random(-85, 85), random(20, 33), random(-200, -60));
      for (let j = 0; j < 3; j++) {
        const puff = new THREE.Mesh(sphereGeometry, this.cloudMaterial);
        puff.position.set(j * 3.7, Math.sin(j) * 1.1, 0);
        puff.scale.set(4.2, 1.9, 2.3);
        cloud.add(puff);
      }
      scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  public move(amount: number, recycleLength: number): void {
    const random = (min: number, max: number) => min + Math.random() * (max - min);

    for (const object of this.scenery) {
      object.position.z += amount;
      if (object.position.z > 30) {
        object.position.z -= recycleLength;
        const type = object.userData.type;
        const side = object.userData.side;
        if (type === 0 || type === 5) {
          object.position.x = side * random(16, 29);
          object.scale.set(random(0.85, 1.2), random(0.8, 1.3), random(0.85, 1.2));
        } else if (![3, 8].includes(type)) {
          object.position.x = side * random(type === 6 ? 8.5 : 10, type === 6 ? 13 : 21);
        }
      }
    }
  }

  public updateClouds(dt: number): void {
    for (const cloud of this.clouds) {
      cloud.position.x += dt * 0.17;
      if (cloud.position.x > 110) {
        cloud.position.x = -110;
      }
    }
  }

  public destroy(scene: THREE.Scene): void {
    for (const obj of this.scenery) {
      scene.remove(obj);
    }
    for (const m of this.mountains) {
      scene.remove(m);
    }
    for (const c of this.clouds) {
      scene.remove(c);
    }
    this.cloudMaterial.dispose();
  }
}
