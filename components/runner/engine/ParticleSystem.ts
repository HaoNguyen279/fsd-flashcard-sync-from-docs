import * as THREE from "three";

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  duration: number;
  size: number;
  crash: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private materials: THREE.MeshBasicMaterial[] = [];
  private sphereGeometry: THREE.IcosahedronGeometry;

  constructor(scene: THREE.Scene, sharedSphereGeometry: THREE.IcosahedronGeometry) {
    this.sphereGeometry = sharedSphereGeometry;

    const particleColors = [0x8df0c8, 0xffe4a7, 0xffffff, 0xff7c54, 0x697b81];
    this.materials = particleColors.map(
      (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
    );

    for (let i = 0; i < 66; i++) {
      const mesh = new THREE.Mesh(this.sphereGeometry, this.materials[i % this.materials.length]);
      mesh.visible = false;
      scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        duration: 1,
        size: 0.1,
        crash: false,
      });
    }
  }

  private random(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  public emit(crashEffect: boolean, carX: number, carZ: number, reducedMotion: boolean): void {
    let count = 0;
    const targetCount = reducedMotion ? 14 : crashEffect ? 42 : 26;

    for (const particle of this.particles) {
      if (particle.life > 0) continue;
      if (count >= targetCount) break;

      const paletteIndex = crashEffect ? (count % 2 ? 3 : 4) : count % 3;
      particle.mesh.material = this.materials[paletteIndex];
      particle.mesh.position.set(carX + this.random(-0.6, 0.6), this.random(0.3, 1.1), carZ);
      particle.velocity.set(this.random(-3.7, 3.7), this.random(2.5, 6), this.random(-3, 4));
      particle.duration = this.random(0.65, 1.3);
      particle.life = particle.duration;
      particle.size = this.random(0.06, crashEffect ? 0.2 : 0.13);
      particle.crash = crashEffect;
      particle.mesh.scale.setScalar(particle.size);
      particle.mesh.visible = true;
      count++;
    }
  }

  public update(dt: number): void {
    for (const particle of this.particles) {
      if (particle.life <= 0) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.mesh.visible = false;
        continue;
      }
      particle.velocity.y -= dt * (particle.crash ? 6 : 8);
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.rotation.x += dt * 3;
      particle.mesh.rotation.z += dt * 4;
      particle.mesh.scale.setScalar(particle.size * Math.min(1, particle.life * 3));
    }
  }

  public reset(): void {
    for (const particle of this.particles) {
      particle.life = 0;
      particle.mesh.visible = false;
    }
  }

  public destroy(scene: THREE.Scene): void {
    for (const particle of this.particles) {
      scene.remove(particle.mesh);
    }
    this.particles = [];
    for (const mat of this.materials) {
      mat.dispose();
    }
    this.materials = [];
  }
}
