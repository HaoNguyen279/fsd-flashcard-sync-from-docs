import * as THREE from "three";
import { RunnerConfig, RunnerQuestion, QuestionProvider, GameState, HUDReferences } from "../types";
import { DEFAULT_CONFIG } from "../constants";
import { AudioManager } from "./AudioManager";
import { ParticleSystem } from "./ParticleSystem";
import { Car } from "./Car";
import { Road } from "./Road";
import { Environment } from "./Environment";
import { Obstacle } from "./Obstacle";
import { ProjectionManager } from "./ProjectionManager";

export interface GameEngineOptions {
  container: HTMLElement;
  hud: HUDReferences;
  questionProvider: QuestionProvider;
  config?: Partial<RunnerConfig>;
  onStateChange?: (state: GameState) => void;
}

export class GameEngine {
  private config: RunnerConfig;
  private questionProvider: QuestionProvider;
  private hud: HUDReferences;
  private onStateChangeCallback?: (state: GameState) => void;

  // Three.js Core
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private cameraTarget = new THREE.Vector3();
  private cameraBaseY = 8;
  private cameraBaseZ = 15;

  // Shared Geometries & Materials
  private boxGeometry!: THREE.BoxGeometry;
  private sphereGeometry!: THREE.IcosahedronGeometry;
  private coneGeometry!: THREE.ConeGeometry;
  private materials = new Map<string, THREE.MeshStandardMaterial>();

  // Subsystems
  private audioManager!: AudioManager;
  private particleSystem!: ParticleSystem;
  private car!: Car;
  private road!: Road;
  private environment!: Environment;
  private obstacle!: Obstacle;
  private projectionManager!: ProjectionManager;

  // Game State
  private state: GameState = "START";
  private currentLane = 1;
  private score = 0;
  private distance = 0;
  private streak = 0;
  private longestStreak = 0;
  private bestScore = 0;
  private speed = 20;
  /** Reaction time for the current gate; shrinks every `streakPerLevel` streak */
  private currentReactionTime = 5;
  private pendingLevelUp = false;
  private levelUpTimer = 0;
  private gateNumber = 0;
  private question: RunnerQuestion | null = null;
  private elapsed = 0;
  private stateElapsed = 0;
  private movedThisQuestion = false;
  private bounce = 0;
  private shake = 0;
  private flash = 0;
  private lastTickSecond = -1;
  private ready = false;
  private previousTime = 0;
  private animationTime = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private reducedMotion = false;

  // Handles & Event Listeners
  private rafId: number | null = null;
  private gesture: { id: number; x: number; y: number } | null = null;
  private boundResize: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundFinishGesture: (e: PointerEvent) => void;
  private boundContextLost: (e: Event) => void;

  constructor(options: GameEngineOptions) {
    this.config = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    this.questionProvider = options.questionProvider;
    this.hud = options.hud;
    this.onStateChangeCallback = options.onStateChange;

    this.boundResize = this.handleResize.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
    this.boundFinishGesture = this.finishGesture.bind(this);
    this.boundContextLost = this.handleContextLost.bind(this);

    this.init();
  }

  private getMaterial(color: number, roughness = 0.85): THREE.MeshStandardMaterial {
    const key = `${color}-${roughness}`;
    if (!this.materials.has(key)) {
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness, flatShading: true })
      );
    }
    return this.materials.get(key)!;
  }

  private init(): void {
    if (typeof window === "undefined") return;

    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    try {
      this.bestScore = Number(localStorage.getItem("vocabRunnerBest")) || 0;
    } catch (_) {
      this.bestScore = 0;
    }
    if (this.hud.bestValue) {
      this.hud.bestValue.textContent = String(this.bestScore);
    }
    if (this.hud.startBestScore) {
      this.hud.startBestScore.textContent = this.bestScore.toLocaleString();
    }

    // WebGLRenderer setup
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (_) {
      this.showLoadError("This browser could not start WebGL. Please use a modern browser.");
      return;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    this.renderer.setSize(this.viewportWidth, this.viewportHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.hud.canvasContainer.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener("webglcontextlost", this.boundContextLost);

    // Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xc6e6e3, 55, 205);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      55,
      this.viewportWidth / this.viewportHeight,
      0.1,
      330
    );

    // Lights
    const ambient = new THREE.HemisphereLight(0xd9f5ff, 0x6c8d55, 2.3);
    this.scene.add(ambient);

    const sunlight = new THREE.DirectionalLight(0xffefcc, 2.7);
    sunlight.position.set(-20, 36, 12);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    sunlight.shadow.camera.left = -22;
    sunlight.shadow.camera.right = 22;
    sunlight.shadow.camera.top = 26;
    sunlight.shadow.camera.bottom = -36;
    sunlight.shadow.camera.near = 1;
    sunlight.shadow.camera.far = 100;
    sunlight.shadow.normalBias = 0.04;
    sunlight.target.position.set(0, 0, -12);
    this.scene.add(sunlight, sunlight.target);

    // Shared Geometries
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.sphereGeometry = new THREE.IcosahedronGeometry(1, 0);
    this.coneGeometry = new THREE.ConeGeometry(1, 1, 6);

    // Subsystems
    this.audioManager = new AudioManager();
    this.particleSystem = new ParticleSystem(this.scene, this.sphereGeometry);
    this.car = new Car(
      this.scene,
      this.boxGeometry,
      this.getMaterial.bind(this),
      this.config.lanes[this.currentLane],
      this.config.carZ
    );
    this.road = new Road(
      this.scene,
      this.boxGeometry,
      this.getMaterial.bind(this),
      this.config,
      this.currentLane
    );
    this.environment = new Environment(
      this.scene,
      this.boxGeometry,
      this.sphereGeometry,
      this.coneGeometry,
      this.getMaterial.bind(this)
    );
    this.obstacle = new Obstacle(
      this.scene,
      this.boxGeometry,
      this.sphereGeometry,
      this.getMaterial.bind(this),
      this.config
    );
    this.projectionManager = new ProjectionManager();

    // Event Listeners
    window.addEventListener("resize", this.boundResize);
    window.addEventListener("keydown", this.boundKeyDown);

    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", this.boundPointerDown);
    canvas.addEventListener("pointermove", this.boundPointerMove);
    canvas.addEventListener("pointerup", this.boundFinishGesture);
    canvas.addEventListener("pointercancel", this.boundFinishGesture);
    canvas.addEventListener("lostpointercapture", this.boundFinishGesture);

    // Button event listeners
    this.hud.startButton.addEventListener("click", () => this.startRun());
    this.hud.restartButton.addEventListener("click", () => this.startRun());
    if (this.hud.closeGameOverButton) {
      this.hud.closeGameOverButton.addEventListener("click", () => this.returnToStartScreen());
    } else {
      const closeBtn = document.getElementById("runner-close-game-over-button");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => this.returnToStartScreen());
      }
    }
    this.hud.leftButton.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.steer(-1);
    });
    this.hud.rightButton.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.steer(1);
    });
    this.hud.soundToggle.addEventListener("click", () => {
      const enabled = this.audioManager.toggleSound();
      this.hud.soundToggle.textContent = enabled ? "Sound on" : "Sound off";
      this.hud.soundToggle.setAttribute("aria-pressed", String(enabled));
      this.hud.soundToggle.setAttribute("aria-label", enabled ? "Disable sound" : "Enable sound");
    });
    const initialSound = this.audioManager.soundEnabled;
    this.hud.soundToggle.textContent = initialSound ? "Sound on" : "Sound off";
    this.hud.soundToggle.setAttribute("aria-pressed", String(initialSound));
    this.hud.soundToggle.setAttribute("aria-label", initialSound ? "Disable sound" : "Enable sound");

    this.handleResize(true);

    // Pre-compile scene shaders upfront to eliminate runtime shader compilation stutter
    try {
      this.renderer.compile(this.scene, this.camera);
    } catch (_) {}

    this.ready = true;
    this.hud.startButton.disabled = false;
    const promptText = this.hud.startButton.querySelector(".runner-start-prompt-text");
    if (promptText) {
      promptText.textContent = "PRESS TO START";
    } else {
      this.hud.startButton.textContent = "PRESS TO START →";
    }

    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    this.previousTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop.bind(this));
  }

  private showLoadError(message: string): void {
    const errEl = document.getElementById("runner-load-error");
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = message;
    }
    if (this.hud.startButton) {
      this.hud.startButton.disabled = true;
      const promptText = this.hud.startButton.querySelector(".runner-start-prompt-text");
      if (promptText) {
        promptText.textContent = "HIGHWAY UNAVAILABLE";
      } else {
        this.hud.startButton.textContent = "HIGHWAY UNAVAILABLE";
      }
    }
  }

  private handleContextLost(e: Event): void {
    e.preventDefault();
    this.hud.hud.hidden = true;
    this.hud.laneLabelsContainer.hidden = true;
    this.hud.gameOverScreen.hidden = true;
    this.hud.startScreen.hidden = false;
    this.ready = false;
    this.setState("START");
    this.showLoadError("The graphics connection was lost. Reload the page to start a fresh run.");
  }

  private handleResize(force = false): void {
    if (!this.renderer || !this.camera) return;
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    if (!force && newWidth === this.viewportWidth && newHeight === this.viewportHeight) {
      return;
    }
    this.viewportWidth = newWidth;
    this.viewportHeight = newHeight;
    const portrait = this.viewportWidth / this.viewportHeight < 0.85;

    this.cameraBaseY = portrait ? 11.5 : 8;
    this.cameraBaseZ = portrait ? 22 : 15;
    this.camera.fov = portrait ? 73 : 55;
    this.camera.aspect = this.viewportWidth / this.viewportHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.viewportWidth, this.viewportHeight);
    if (force) {
      this.camera.position.y = this.cameraBaseY;
      this.camera.position.z = this.cameraBaseZ;
      this.camera.lookAt(0, 0.3, portrait ? -13 : -18);
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if (this.state === "START") {
      if (key === " " || key === "enter") {
        event.preventDefault();
        this.startRun();
        return;
      }
    }
    if (this.state === "GAME_OVER") {
      if (key === "escape") {
        event.preventDefault();
        this.returnToStartScreen();
        return;
      }
    }
    if (["arrowleft", "arrowright", "a", "d"].includes(key)) {
      event.preventDefault();
      if (event.repeat) return;
      this.steer(key === "arrowleft" || key === "a" ? -1 : 1);
    }
  }

  private handlePointerDown(event: PointerEvent): void {
    if (this.state !== "PLAYING" && this.state !== "SUCCESS") return;
    if (this.gesture) return;
    this.gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.renderer.domElement.setPointerCapture(event.pointerId);
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.gesture || event.pointerId !== this.gesture.id) return;
    const dx = event.clientX - this.gesture.x;
    const dy = event.clientY - this.gesture.y;
    if (Math.abs(dx) >= 32 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      this.steer(dx < 0 ? -1 : 1);
      this.gesture.x = event.clientX;
      this.gesture.y = event.clientY;
    }
  }

  private handlePointerUp(event: PointerEvent): void {
    this.finishGesture(event);
  }

  private finishGesture(event: PointerEvent): void {
    if (this.gesture && this.gesture.id === event.pointerId) {
      this.gesture = null;
    }
  }

  public steer(direction: number): void {
    if (!this.ready || (this.state !== "PLAYING" && this.state !== "SUCCESS")) return;
    this.audioManager.unlockAudio();
    const nextLane = Math.max(0, Math.min(3, this.currentLane + direction));
    if (nextLane === this.currentLane) return;

    this.currentLane = nextLane;
    if (this.state === "PLAYING") this.movedThisQuestion = true;
    this.updateSelectedLane();
    this.audioManager.playTone(300 + this.currentLane * 50, 0.045, "sine", 0.025);
  }

  private startQuestion(): void {
    const q = this.questionProvider.nextQuestion();
    this.question = q;

    this.gateNumber++;
    this.elapsed = 0;
    this.stateElapsed = 0;
    this.movedThisQuestion = false;
    this.lastTickSecond = -1;
    this.setState("PLAYING");

    // Difficulty progression: shrink reaction time every N streak (floor at minReactionTime).
    // World speed scales inversely with reaction time so the gate spawns at the same
    // visual distance but rushes toward the car faster.
    this.currentReactionTime = this.computeReactionTime(this.streak);
    const speedMultiplier = this.config.reactionTime / this.currentReactionTime;
    this.speed =
      Math.min(this.config.maxSpeed, this.config.baseSpeed + this.streak * 0.65) * speedMultiplier;
    const obstacleStart = this.config.carZ - this.speed * this.currentReactionTime;
    this.obstacle.resetQuestion(obstacleStart);

    if (this.pendingLevelUp) {
      this.pendingLevelUp = false;
      this.showLevelUpToast();
    }

    this.hud.laneLabelsContainer.hidden = false;
    this.hud.questionPanel.classList.remove("urgent");
    this.hud.meaning.textContent = q.meaning;
    this.hud.questionNumber.textContent = `GATE ${String(this.gateNumber).padStart(2, "0")}`;

    this.hud.laneLabelItems.forEach((label, index) => {
      const wordSpan = label.querySelector(".runner-answer-word");
      if (wordSpan) {
        wordSpan.textContent = q.options[index];
      }
    });

    this.hud.progressBar.setAttribute("aria-valuemax", String(this.currentReactionTime));
    this.updateSelectedLane();
    this.updateTimer();
    this.hud.liveStatus.textContent = `${q.meaning}. ${q.options
      .map((word, index) => `Lane ${index + 1}:${word}`)
      .join(". ")}. ${this.currentReactionTime} seconds.`;
  }

  private computeReactionTime(streak: number): number {
    const level = Math.floor(streak / this.config.streakPerLevel);
    return Math.max(
      this.config.minReactionTime,
      this.config.reactionTime - level * this.config.reactionTimeStep
    );
  }

  private showLevelUpToast(): void {
    if (this.hud.levelUpSubtitle) {
      this.hud.levelUpSubtitle.textContent = `−${this.config.reactionTimeStep}s · ${this.currentReactionTime.toFixed(1)}s per gate`;
    }
    if (this.hud.levelUpToast) {
      this.hud.levelUpToast.classList.add("visible");
    }
    this.levelUpTimer = 1.6;
    this.audioManager.playTone(520, 0.1, "square", 0.03);
    this.audioManager.playTone(780, 0.14, "square", 0.03, 0.08);
  }

  private hideLevelUpToast(): void {
    this.levelUpTimer = 0;
    this.pendingLevelUp = false;
    if (this.hud.levelUpToast) {
      this.hud.levelUpToast.classList.remove("visible");
    }
  }

  private resolveCollision(): void {
    if (this.state !== "PLAYING" || !this.question) return;
    const settledInLane =
      Math.abs(this.car.group.position.x - this.config.lanes[this.currentLane]) < 0.65;

    if (this.currentLane !== this.question.correctIndex) {
      this.crash(
        this.movedThisQuestion
          ? "You drove into the wrong answer."
          : "Time expired without a lane move. Make a steering decision for every gate."
      );
    } else if (!settledInLane) {
      this.crash("You were still between lanes when the barricade arrived.");
    } else {
      this.success();
    }
  }

  private success(): void {
    if (!this.question) return;
    this.setState("SUCCESS");
    this.stateElapsed = 0;
    this.score += 100;
    this.streak++;
    this.longestStreak = Math.max(this.longestStreak, this.streak);
    this.bounce = 0.8;

    // Shown when the next gate starts (after the CORRECT popup fades)
    if (this.computeReactionTime(this.streak) < this.currentReactionTime) {
      this.pendingLevelUp = true;
    }

    this.obstacle.openGate(this.question.correctIndex);
    this.hud.laneLabelsContainer.hidden = true;
    this.hud.toast.classList.add("visible");
    this.hud.questionPanel.classList.remove("urgent");
    this.hud.meaning.textContent = `✓ ${this.question.word} — that's the word!`;
    this.hud.timerValue.textContent = "PASS";
    this.hud.timerFill.style.transform = "scaleX(1)";
    this.hud.liveStatus.textContent = `Correct! ${this.question.word}. Plus one hundred points. Streak ${this.streak}.`;

    this.particleSystem.emit(
      false,
      this.car.group.position.x,
      this.config.carZ,
      this.reducedMotion
    );
    this.audioManager.playTone(660, 0.13, "sine", 0.06);
    this.audioManager.playTone(880, 0.16, "sine", 0.05, 0.09);
    this.audioManager.playTone(1100, 0.2, "sine", 0.045, 0.19);
    this.updateStats();
  }

  private crash(reason: string): void {
    if (!this.question) return;
    this.setState("CRASH");
    this.stateElapsed = 0;
    this.obstacle.freezeCrash(this.config.carZ);

    this.hud.laneLabelsContainer.hidden = true;
    this.hud.toast.classList.remove("visible");
    this.hideLevelUpToast();
    this.hud.questionPanel.classList.remove("urgent");
    this.hud.meaning.textContent = "Collision. End of the road.";
    this.hud.timerValue.textContent = "0.0s";
    this.hud.timerFill.style.transform = "scaleX(0)";
    this.hud.progressBar.setAttribute("aria-valuenow", "0");

    this.shake = this.reducedMotion ? 0 : 0.4;
    this.flash = this.reducedMotion ? 0.06 : 0.3;

    this.hud.crashReason.textContent = reason;
    this.hud.correctRecap.textContent = this.question.word.toUpperCase();
    this.hud.chosenRecap.textContent = this.question.options[this.currentLane].toUpperCase();
    this.hud.finalScore.textContent = this.score.toLocaleString();
    this.hud.finalDistance.textContent = `${Math.floor(this.distance)} m`;
    this.hud.finalStreak.textContent = `×${this.longestStreak}`;

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem("vocabRunnerBest", String(this.bestScore));
      } catch (_) {}
    }

    if (this.hud.bestValue) {
      this.hud.bestValue.textContent = String(this.bestScore);
    }
    if (this.hud.startBestScore) {
      this.hud.startBestScore.textContent = this.bestScore.toLocaleString();
    }
    this.hud.liveStatus.textContent = `Crash. ${reason} Correct answer: ${this.question.word}. Score: ${this.score}.`;

    this.particleSystem.emit(true, this.car.group.position.x, this.config.carZ, this.reducedMotion);
    this.audioManager.playCrashSound();
  }

  private showGameOver(): void {
    this.setState("GAME_OVER");
    this.hud.gameOverScreen.hidden = false;
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  private updateSelectedLane(): void {
    this.hud.laneLabelItems.forEach((label, index) => {
      label.classList.toggle("selected", index === this.currentLane);
    });
  }

  private updateStats(): void {
    if (this.hud.scoreValue) {
      this.hud.scoreValue.textContent = String(this.score).padStart(4, "0");
    }
    if (this.hud.distanceValue) {
      this.hud.distanceValue.textContent = Math.floor(this.distance).toLocaleString();
    }
    if (this.hud.streakValue) {
      this.hud.streakValue.textContent = `×${this.streak}`;
    }
    if (this.hud.speedValue) {
      this.hud.speedValue.textContent = String(Math.round(this.speed * 3.6));
    }
  }

  private updateTimer(): void {
    const remaining = Math.max(0, this.currentReactionTime - this.elapsed);
    this.hud.timerFill.style.transform = `scaleX(${remaining / this.currentReactionTime})`;
    this.hud.timerValue.textContent = `${remaining.toFixed(1)}s`;
    this.hud.progressBar.setAttribute("aria-valuenow", remaining.toFixed(1));
    this.hud.questionPanel.classList.toggle("urgent", remaining < 1.5);

    const second = Math.ceil(remaining);
    if (second <= 3 && second > 0 && second !== this.lastTickSecond) {
      this.lastTickSecond = second;
      this.audioManager.playTone(440, 0.045, "sine", 0.018);
    }
  }

  public startRun(): void {
    if (!this.ready || this.state === "PLAYING" || this.state === "SUCCESS") return;
    this.audioManager.unlockAudio();
    this.score = 0;
    this.distance = 0;
    this.streak = 0;
    this.longestStreak = 0;
    this.gateNumber = 0;
    this.currentLane = 1;
    this.speed = this.config.baseSpeed;
    this.currentReactionTime = this.config.reactionTime;
    this.hideLevelUpToast();
    this.bounce = 0;
    this.shake = 0;
    this.flash = 0;
    this.gesture = null;
    this.stateElapsed = 0;

    this.car.reset(this.config.lanes[this.currentLane], this.config.carZ);
    this.road.reset(this.config.lanes[this.currentLane]);
    this.particleSystem.reset();
    this.camera.position.x = 0;

    this.hud.startScreen.hidden = true;
    this.hud.gameOverScreen.hidden = true;
    this.hud.hud.hidden = false;
    this.hud.toast.classList.remove("visible");
    this.hud.flash.style.opacity = "0";

    this.previousTime = performance.now();
    this.updateStats();
    this.startQuestion();

    this.hud.startButton.blur();
    this.hud.restartButton.blur();
  }

  public returnToStartScreen(): void {
    if (!this.ready) return;
    this.setState("START");
    this.obstacle.group.visible = false;
    this.particleSystem.reset();
    this.bounce = 0;
    this.shake = 0;
    this.flash = 0;
    this.gesture = null;
    this.stateElapsed = 0;
    this.animationTime = 0;
    this.currentLane = 1;

    // Reset car and road to lane 2
    this.car.reset(this.config.lanes[this.currentLane], this.config.carZ);
    this.road.reset(this.config.lanes[this.currentLane]);
    this.camera.position.x = 0;

    // Reset UI visibility
    this.hud.gameOverScreen.hidden = true;
    this.hud.hud.hidden = true;
    this.hud.laneLabelsContainer.hidden = true;
    this.hud.toast.classList.remove("visible");
    this.hideLevelUpToast();
    this.hud.flash.style.opacity = "0";
    this.hud.startScreen.hidden = false;
    if (this.hud.startBestScore) {
      this.hud.startBestScore.textContent = this.bestScore.toLocaleString();
    }

    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  public updateQuestionProvider(newProvider: QuestionProvider): void {
    this.questionProvider = newProvider;
  }

  private setState(newState: GameState): void {
    this.state = newState;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }

  private updateCamera(dt: number): void {
    const horizontalTarget = this.car.group.position.x * 0.15;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, horizontalTarget, 3, dt);
    this.shake = Math.max(0, this.shake - dt * 0.55);

    const random = (min: number, max: number) => min + Math.random() * (max - min);
    this.camera.position.y = this.cameraBaseY + (this.shake ? random(-this.shake, this.shake) : 0);
    this.camera.position.z = this.cameraBaseZ + (this.shake ? random(-this.shake, this.shake) : 0);

    const portrait = this.viewportWidth / this.viewportHeight < 0.85;
    this.cameraTarget.set(this.car.group.position.x * 0.07, 0.3, portrait ? -13 : -18);
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateMatrixWorld();
  }

  private loop(now: number): void {
    this.rafId = requestAnimationFrame(this.loop.bind(this));
    if (!this.ready) return;

    const realDelta = Math.max(0, (now - this.previousTime) / 1000);
    this.previousTime = now;

    // Delta spike hitch suppression:
    // If a frame took abnormally long (> 0.045s, e.g. background task, GC, or tab lag),
    // clamp dt to a standard single frame (~0.0166s) to prevent a visible jerk or teleport.
    const dt = realDelta > 0.045 ? 0.0166 : Math.min(realDelta, 0.0333);
    this.animationTime += dt;

    const running = this.state === "PLAYING" || this.state === "SUCCESS";

    if (this.levelUpTimer > 0 && running) {
      this.levelUpTimer -= dt;
      if (this.levelUpTimer <= 0) {
        this.hideLevelUpToast();
      }
    }

    if (this.state === "PLAYING") {
      const previousElapsed = this.elapsed;
      this.elapsed = Math.min(this.currentReactionTime, this.elapsed + realDelta);

      this.obstacle.group.position.z =
        this.config.carZ - this.speed * (this.currentReactionTime - this.elapsed);
      this.distance += this.speed * (this.elapsed - previousElapsed);

      this.road.move(this.speed * dt, this.config.recycleLength);
      this.environment.move(this.speed * dt, this.config.recycleLength);
      this.car.update(
        dt,
        this.config.lanes[this.currentLane],
        this.speed,
        true,
        this.state,
        this.stateElapsed,
        this.animationTime,
        this.bounce,
        this.reducedMotion,
        this.config
      );
      this.updateTimer();
      this.updateStats();

      if (this.elapsed >= this.currentReactionTime) {
        this.resolveCollision();
      }
    } else if (this.state === "SUCCESS") {
      this.stateElapsed += dt;
      this.distance += this.speed * dt;
      this.road.move(this.speed * dt, this.config.recycleLength);
      this.environment.move(this.speed * dt, this.config.recycleLength);
      this.obstacle.group.position.z += this.speed * dt;

      this.car.update(
        dt,
        this.config.lanes[this.currentLane],
        this.speed,
        true,
        this.state,
        this.stateElapsed,
        this.animationTime,
        this.bounce,
        this.reducedMotion,
        this.config
      );
      this.updateStats();

      if (this.stateElapsed >= this.config.successDuration) {
        this.hud.toast.classList.remove("visible");
        this.startQuestion();
      }
    } else if (this.state === "CRASH") {
      this.stateElapsed += dt;
      const slowdown = Math.max(0, 1 - this.stateElapsed / 0.45);
      this.road.move(this.speed * dt * slowdown * 0.18, this.config.recycleLength);
      this.environment.move(this.speed * dt * slowdown * 0.18, this.config.recycleLength);

      this.car.update(
        dt,
        this.config.lanes[this.currentLane],
        this.speed,
        false,
        this.state,
        this.stateElapsed,
        this.animationTime,
        this.bounce,
        this.reducedMotion,
        this.config
      );

      if (this.stateElapsed >= this.config.crashDuration) {
        this.showGameOver();
      }
    } else if (this.state === "START") {
      // Live attract mode: road and scenery scroll smoothly at cruising speed
      // Car weaves smoothly back and forth across all 4 lanes in a continuous loop
      // Starting phase (-0.3398 rad) aligns directly at Lane 2 (-1.5) heading right towards Lane 4
      const startPhase = -0.3398369; // Math.asin(-1.5 / 4.5)
      const weaveTargetX = Math.sin(this.animationTime * 1.1 + startPhase) * 4.5;
      this.road.move(this.config.baseSpeed * dt, this.config.recycleLength);
      this.environment.move(this.config.baseSpeed * dt, this.config.recycleLength);
      this.car.update(
        dt,
        weaveTargetX,
        this.config.baseSpeed,
        true,
        this.state,
        0,
        this.animationTime,
        0,
        this.reducedMotion,
        this.config
      );
    }

    this.environment.updateClouds(dt);

    if (this.obstacle.group.visible && running) {
      this.obstacle.updatePadHighlight(this.currentLane);
    }

    const targetX = this.state === "START" ? this.car.group.position.x : this.config.lanes[this.currentLane];
    const showGlow = running || this.state === "START";
    this.road.updateGlow(targetX, showGlow, dt);

    this.particleSystem.update(dt);
    this.updateCamera(dt);

    this.projectionManager.update(
      this.camera,
      this.obstacle.group.position.z,
      this.config.lanes,
      this.viewportWidth,
      this.viewportHeight,
      this.hud.laneLabelItems,
      this.hud.questionPanel,
      this.hud.laneLabelsContainer.hidden
    );

    this.flash = Math.max(0, this.flash - dt * 0.8);
    this.hud.flash.style.opacity = String(this.flash);

    this.renderer.render(this.scene, this.camera);
  }

  public destroy(): void {
    this.ready = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.boundResize);
      window.removeEventListener("keydown", this.boundKeyDown);
    }

    if (this.renderer && this.renderer.domElement) {
      const canvas = this.renderer.domElement;
      canvas.removeEventListener("webglcontextlost", this.boundContextLost);
      canvas.removeEventListener("pointerdown", this.boundPointerDown);
      canvas.removeEventListener("pointermove", this.boundPointerMove);
      canvas.removeEventListener("pointerup", this.boundFinishGesture);
      canvas.removeEventListener("pointercancel", this.boundFinishGesture);
      canvas.removeEventListener("lostpointercapture", this.boundFinishGesture);

      if (canvas.parentElement) {
        canvas.parentElement.removeChild(canvas);
      }
    }

    if (this.particleSystem) this.particleSystem.destroy(this.scene);
    if (this.car) this.car.destroy(this.scene);
    if (this.road) this.road.destroy(this.scene);
    if (this.environment) this.environment.destroy(this.scene);
    if (this.obstacle) this.obstacle.destroy(this.scene);
    if (this.audioManager) this.audioManager.destroy();

    if (this.boxGeometry) this.boxGeometry.dispose();
    if (this.sphereGeometry) this.sphereGeometry.dispose();
    if (this.coneGeometry) this.coneGeometry.dispose();

    this.materials.forEach((mat) => {
      mat.dispose();
    });
    this.materials.clear();

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
