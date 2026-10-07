import * as THREE from "three";
import { RunnerConfig } from "../types";

export class ProjectionManager {
  private projectionPoint = new THREE.Vector3();

  public update(
    camera: THREE.PerspectiveCamera,
    obstacleZ: number,
    lanes: number[],
    viewportWidth: number,
    viewportHeight: number,
    labelItems: HTMLElement[],
    questionPanel: HTMLElement | null,
    hidden: boolean
  ): void {
    if (hidden || labelItems.length < 4) return;

    const mobile = viewportWidth <= 700;
    const edge = mobile ? 6 : 24;
    const availableWidth = viewportWidth - edge * 2;
    const cardWidth = Math.min(mobile ? 84 : 136, availableWidth / 4 - 6);
    const minimumSpacing = cardWidth + 6;

    const hudBottom = questionPanel ? questionPanel.getBoundingClientRect().bottom : 120;
    const maximumY = Math.max(hudBottom + 80, viewportHeight - 115);

    // Compute center reference projection
    this.projectionPoint.set(0, 2.6, obstacleZ);
    this.projectionPoint.project(camera);
    const centerProjectedX = (this.projectionPoint.x * 0.5 + 0.5) * viewportWidth;

    const centerX = Math.max(
      edge + minimumSpacing * 1.5 + cardWidth / 2,
      Math.min(viewportWidth - edge - minimumSpacing * 1.5 - cardWidth / 2, centerProjectedX)
    );

    for (let i = 0; i < 4; i++) {
      this.projectionPoint.set(lanes[i], 2.6, obstacleZ);
      this.projectionPoint.project(camera);

      const projectedX = (this.projectionPoint.x * 0.5 + 0.5) * viewportWidth;
      const projectedY = (-this.projectionPoint.y * 0.5 + 0.5) * viewportHeight;

      const projectedSpacing =
        Math.abs(projectedX - centerProjectedX) / Math.max(0.5, Math.abs(i - 1.5));
      const spacing = Math.min(
        (availableWidth - cardWidth) / 3,
        Math.max(minimumSpacing, projectedSpacing)
      );

      const label = labelItems[i];
      if (label) {
        label.style.width = `${cardWidth}px`;
        label.style.left = `${centerX + (i - 1.5) * spacing}px`;
        label.style.top = `${Math.max(hudBottom + 79, Math.min(maximumY, projectedY))}px`;
      }
    }
  }
}
