import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./index.css";

type Section =
  | "construction"
  | "exterior"
  | "interior"
  | "architect"
  | null;

type GlassType =
  | "clear"
  | "tinted"
  | "mesh"
  | "diamond";

type FloorType =
  | "dark"
  | "grey"
  | "light"
  | "wood";

type WallType =
  | "white"
  | "grey"
  | "black"
  | "beige";

type DesignType =
  | "classic"
  | "modern"
  | "wood"
  | "geometric"
  | "marble"
  | "sunset";

type CeilingType =
  | "white"
  | "black"
  | "grey";

type CameraPreset =
  | "full"
  | "front"
  | "interior"
  | "floor"
  | "ceiling";

type LightingMode =
  | "day"
  | "warm"
  | "night";

function App() {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const sceneRef =
    useRef<THREE.Scene | null>(null);

  const floorGroupRef =
    useRef<THREE.Group | null>(null);

  const baseModuleRef =
    useRef<THREE.Group | null>(null);

  const cameraRef =
    useRef<THREE.PerspectiveCamera | null>(
      null
    );

  const controlsRef =
    useRef<OrbitControls | null>(null);

  const rendererRef =
    useRef<THREE.WebGLRenderer | null>(
      null
    );

  const [activeSection, setActiveSection] =
    useState<Section>("construction");

  const [floorCount, setFloorCount] =
    useState(2);

  const [width, setWidth] =
    useState(1100);

  const [depth, setDepth] =
    useState(1400);

  const [floorHeight, setFloorHeight] =
    useState(2500);

  const [ceilingHeight, setCeilingHeight] =
    useState(2400);

  const [frameColor, setFrameColor] =
    useState("#3a3a3a");

  const [glassType, setGlassType] =
    useState<GlassType>("clear");

  const [floorType, setFloorType] =
    useState<FloorType>("dark");

  const [wallType, setWallType] =
    useState<WallType>("white");

  const [designType, setDesignType] =
    useState<DesignType>("classic");

  const [ceilingType, setCeilingType] =
    useState<CeilingType>("white");

  const [lighting, setLighting] =
    useState(true);

  const [lightingMode, setLightingMode] =
    useState<LightingMode>("day");

  const [lightIntensity, setLightIntensity] =
    useState(80);

  const [doorOpen, setDoorOpen] =
    useState(false);

  const [architectMode, setArchitectMode] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const moduleHeightRef =
    useRef(2.5);

  const originalModuleSizeRef =
    useRef<THREE.Vector3 | null>(null);

  const lightRef =
    useRef<THREE.PointLight | null>(null);

  const cameraAnimationRef =
    useRef<number | null>(null);

  /*
   * =========================
   * CAMERA HELPERS
   * =========================
   */

  const animateCameraTo = (
    position: THREE.Vector3,
    target: THREE.Vector3,
    duration = 700
  ) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (!camera || !controls) {
      return;
    }

    if (cameraAnimationRef.current !== null) {
      cancelAnimationFrame(
        cameraAnimationRef.current
      );
    }

    const startPosition =
      camera.position.clone();

    const startTarget =
      controls.target.clone();

    const startTime =
      performance.now();

    const animate = (time: number) => {
      const progress = Math.min(
        (time - startTime) / duration,
        1
      );

      const eased =
        1 -
        Math.pow(
          1 - progress,
          3
        );

      camera.position.lerpVectors(
        startPosition,
        position,
        eased
      );

      controls.target.lerpVectors(
        startTarget,
        target,
        eased
      );

      controls.update();

      if (progress < 1) {
        cameraAnimationRef.current =
          requestAnimationFrame(
            animate
          );
      } else {
        cameraAnimationRef.current =
          null;
      }
    };

    cameraAnimationRef.current =
      requestAnimationFrame(
        animate
      );
  };

  const focusOnFeature = (
    materialKeyword: string
  ) => {
    const group =
      floorGroupRef.current;

    if (!group) {
      return;
    }

    const floor =
      group.getObjectByName(
        "Floor_Module_1"
      );

    if (!floor) {
      return;
    }

    const box =
      new THREE.Box3();

    floor.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh)
      ) {
        return;
      }

      const material =
        object.material;

      if (
        !(
          material instanceof
            THREE.MeshStandardMaterial ||
          material instanceof
            THREE.MeshPhysicalMaterial
        )
      ) {
        return;
      }

      if (
        material.name
          .toLowerCase()
          .includes(
            materialKeyword
          )
      ) {
        box.expandByObject(object);
      }
    });

    if (box.isEmpty()) {
      return;
    }

    const size =
      box.getSize(
        new THREE.Vector3()
      );

    const center =
      box.getCenter(
        new THREE.Vector3()
      );

    const maxSize =
      Math.max(
        size.x,
        size.y,
        size.z
      );

    const distance =
      Math.max(
        maxSize * 3,
        3
      );

    const position =
      new THREE.Vector3(
        center.x + distance * 0.8,
        center.y + Math.max(maxSize * 0.7, 1.2),
        center.z + distance * 0.8
      );

    animateCameraTo(
      position,
      center
    );
  };

  /*
   * =========================
   * THREE.JS
   * =========================
   */

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) return;

    const scene =
      new THREE.Scene();

    scene.background =
      new THREE.Color(
        0x11100f
      );

    sceneRef.current =
      scene;

    const camera =
      new THREE.PerspectiveCamera(
        42,
        container.clientWidth /
        container.clientHeight,
        0.01,
        1000
      );

    cameraRef.current =
      camera;

    const renderer =
      new THREE.WebGLRenderer({
        antialias: true,
      });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2
      )
    );

    renderer.setSize(
      container.clientWidth,
      container.clientHeight
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure =
      1.15;

    renderer.shadowMap.enabled =
      true;

    renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    container.appendChild(
      renderer.domElement
    );

    rendererRef.current =
      renderer;

    /*
     * LIGHTS
     */

    const ambient =
      new THREE.AmbientLight(
        0xffffff,
        2
      );

    ambient.name = "Ambient_Light";

    scene.add(ambient);

    const hemisphere =
      new THREE.HemisphereLight(
        0xffffff,
        0x222222,
        1.8
      );

    hemisphere.name = "Hemisphere_Light";

    scene.add(
      hemisphere
    );

    const directional =
      new THREE.DirectionalLight(
        0xffffff,
        3
      );

    directional.position.set(
      5,
      10,
      6
    );

    directional.castShadow =
      true;

    directional.name = "Directional_Light";

    scene.add(
      directional
    );

    const front =
      new THREE.DirectionalLight(
        0xffffff,
        1.5
      );

    front.position.set(
      0,
      5,
      8
    );

    front.name = "Front_Light";

    scene.add(front);

    const interiorLight =
      new THREE.PointLight(
        0xffffff,
        5,
        15
      );

    interiorLight.position.set(
      0,
      2,
      0
    );

    interiorLight.name = "Interior_Light";

    scene.add(
      interiorLight
    );

    lightRef.current =
      interiorLight;

    /*
     * GLB
     */

    const loader =
      new GLTFLoader();

    loader.load(
      "/models/Elevator_Master.glb",

      (gltf) => {
        const base =
          gltf.scene;

        baseModuleRef.current =
          base;

        /*
         * MODEL MATERIALS
         */

        base.traverse(
          (object) => {
            if (
              !(object instanceof THREE.Mesh)
            ) {
              return;
            }

            object.castShadow =
              true;

            object.receiveShadow =
              true;

            const material =
              object.material;

            if (
              material instanceof
              THREE.MeshStandardMaterial ||
              material instanceof
              THREE.MeshPhysicalMaterial
            ) {
              const name =
                material.name.toLowerCase();

              if (
                name.includes("frame") ||
                name.includes("metal")
              ) {
                material.color.set(
                  frameColor
                );

                material.metalness =
                  0.7;

                material.roughness =
                  0.28;
              }

              if (
                name.includes(
                  "floor_base"
                )
              ) {
                material.color.set(
                  0x252525
                );
              }

              if (
                name.includes(
                  "floor_surface"
                )
              ) {
                material.color.set(
                  0x555555
                );
              }

              if (
                name.includes(
                  "interior_wall"
                )
              ) {
                material.color.set(
                  0xf0f0f0
                );
              }

              if (
                name.includes(
                  "ceiling"
                )
              ) {
                material.color.set(
                  0xe5e5e5
                );
              }

              if (
                name.includes(
                  "design_wall"
                )
              ) {
                material.color.set(
                  0x3b3b3b
                );
              }

              if (
                name.includes("glass")
              ) {
                material.color.set(
                  0xeaf6fa
                );

                material.transparent =
                  true;

                material.opacity =
                  0.35;

                material.roughness =
                  0.05;

                material.depthWrite =
                  false;

                if (
                  material instanceof
                  THREE.MeshPhysicalMaterial
                ) {
                  material.transmission =
                    0.9;

                  material.ior =
                    1.45;

                  material.thickness =
                    0.02;
                }
              }
            }
          }
        );

        const box =
          new THREE.Box3().setFromObject(
            base
          );

        const size =
          box.getSize(
            new THREE.Vector3()
          );

        originalModuleSizeRef.current =
          size.clone();

        const center =
          box.getCenter(
            new THREE.Vector3()
          );

        moduleHeightRef.current =
          Math.max(
            size.y,
            2.5
          );

        base.position.x =
          -center.x;

        base.position.y =
          -box.min.y;

        base.position.z =
          -center.z;

        /*
         * FLOOR GROUP
         */

        const floorGroup =
          new THREE.Group();

        floorGroup.name =
          "Dynamic_Elevator";

        floorGroupRef.current =
          floorGroup;

        scene.add(
          floorGroup
        );

        createFloors(
          base,
          floorGroup,
          floorCount,
          moduleHeightRef.current
        );

        /*
         * CAMERA
         */

        fitCamera(
          camera,
          floorGroup
        );

        /*
         * CONTROLS
         */

        const controls =
          new OrbitControls(
            camera,
            renderer.domElement
          );

        controls.enableDamping =
          true;

        controls.dampingFactor =
          0.05;

        controls.enablePan =
          true;

        controls.minDistance =
          2;

        controls.maxDistance =
          40;

        controls.target.set(
          0,
          2,
          0
        );

        controls.update();

        controlsRef.current =
          controls;
      },

      (progress) => {
        if (
          progress.total
        ) {
          console.log(
            `Loading: ${(
              (progress.loaded /
                progress.total) *
              100
            ).toFixed(0)}%`
          );
        }
      },

      (error) => {
        console.error(
          "GLB loading failed",
          error
        );
      }
    );

    /*
     * ANIMATION
     */

    let animationFrameId: number;

    const animate =
      () => {
        animationFrameId =
          requestAnimationFrame(
            animate
          );

        if (
          controlsRef.current
        ) {
          controlsRef.current.update();
        }

        renderer.render(
          scene,
          camera
        );
      };

    animate();

    /*
     * RESIZE
     */

    const resize =
      () => {
        const width =
          container.clientWidth;

        const height =
          container.clientHeight;

        camera.aspect =
          width / height;

        camera.updateProjectionMatrix();

        renderer.setSize(
          width,
          height
        );
      };

    window.addEventListener(
      "resize",
      resize
    );

    return () => {
      cancelAnimationFrame(
        animationFrameId
      );

      if (
        cameraAnimationRef.current !== null
      ) {
        cancelAnimationFrame(
          cameraAnimationRef.current
        );
        cameraAnimationRef.current =
          null;
      }

      window.removeEventListener(
        "resize",
        resize
      );

      controlsRef.current?.dispose();

      renderer.dispose();

      if (
        container.contains(
          renderer.domElement
        )
      ) {
        container.removeChild(
          renderer.domElement
        );
      }
    };
  }, []);

  /*
   * =========================
   * FLOOR UPDATE
   * =========================
   */

  useEffect(() => {
    const base =
      baseModuleRef.current;

    const group =
      floorGroupRef.current;

    const camera =
      cameraRef.current;

    if (
      !base ||
      !group ||
      !camera
    ) {
      return;
    }

    const originalSize =
      originalModuleSizeRef.current;

    const targetHeight =
      floorHeight / 1000;

    if (originalSize) {
      base.scale.y =
        targetHeight /
        originalSize.y;
    }

    moduleHeightRef.current =
      targetHeight;

    createFloors(
      base,
      group,
      floorCount,
      targetHeight
    );

    const box =
      new THREE.Box3().setFromObject(
        group
      );

    const size =
      box.getSize(
        new THREE.Vector3()
      );

    const center =
      box.getCenter(
        new THREE.Vector3()
      );

    const maxSize =
      Math.max(
        size.x,
        size.y,
        size.z
      );

    const distance =
      Math.max(
        maxSize * 2.2,
        6
      );

    animateCameraTo(
      new THREE.Vector3(
        distance,
        Math.max(
          size.y * 0.55,
          3
        ),
        distance
      ),
      center
    );
  }, [
    floorCount,
    floorHeight
  ]);


  /*
   * =========================
   * FRAME COLOR
   * =========================
   */

  useEffect(() => {
    const group =
      floorGroupRef.current;

    if (!group) return;

    group.traverse(
      (object) => {
        if (
          !(object instanceof THREE.Mesh)
        ) {
          return;
        }

        const material =
          object.material;

        if (
          material instanceof
          THREE.MeshStandardMaterial ||
          material instanceof
          THREE.MeshPhysicalMaterial
        ) {
          const name =
            material.name.toLowerCase();

          if (
            name.includes("frame") ||
            name.includes("metal")
          ) {
            material.color.set(
              frameColor
            );
          }
        }
      }
    );
  }, [frameColor]);

  /*
   * =========================
   * GLASS
   * =========================
   */

  useEffect(() => {
    const group =
      floorGroupRef.current;

    if (!group) return;

    group.traverse(
      (object) => {
        if (
          !(object instanceof THREE.Mesh)
        ) {
          return;
        }

        const material =
          object.material;

        if (
          !(
            material instanceof
            THREE.MeshStandardMaterial ||
            material instanceof
            THREE.MeshPhysicalMaterial
          )
        ) {
          return;
        }

        const name =
          material.name.toLowerCase();

        if (
          !name.includes("glass")
        ) {
          return;
        }

        material.transparent =
          true;

        material.depthWrite =
          false;

        if (
          glassType === "clear"
        ) {
          material.color.set(
            0xeaf6fa
          );

          material.opacity =
            0.25;
        }

        if (
          glassType === "tinted"
        ) {
          material.color.set(
            0x52606a
          );

          material.opacity =
            0.55;
        }

        if (
          glassType === "mesh"
        ) {
          material.color.set(
            0x7d8588
          );

          material.opacity =
            0.72;
        }

        if (
          glassType === "diamond"
        ) {
          material.color.set(
            0xd8e6ea
          );

          material.opacity =
            0.65;
        }

        if (
          material instanceof
          THREE.MeshPhysicalMaterial
        ) {
          material.transmission =
            glassType ===
              "clear"
              ? 0.9
              : 0.4;
        }
      }
    );
  }, [glassType]);

  /*
   * =========================
   * FLOOR
   * =========================
   */

  useEffect(() => {
    const group =
      floorGroupRef.current;

    if (!group) return;

    const canvas =
      document.createElement("canvas");

    canvas.width = 512;
    canvas.height = 512;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    const baseColors: Record<FloorType, string> = {
      dark: "#252525",
      grey: "#666666",
      light: "#d2d0ca",
      wood: "#795548",
    };

    ctx.fillStyle = baseColors[floorType];
    ctx.fillRect(0, 0, 512, 512);

    if (floorType === "wood") {
      ctx.strokeStyle = "#4f3428";
      ctx.lineWidth = 3;

      for (let y = 0; y < 512; y += 58) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();

        for (let x = (Math.floor(y / 58) % 2) * 128; x < 512; x += 256) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 58);
          ctx.stroke();
        }
      }
    } else {
      const grout = floorType === "light" ? "#aaa79f" : "#3d3d3d";
      ctx.strokeStyle = grout;
      ctx.lineWidth = 2;

      for (let x = 0; x <= 512; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }

      for (let y = 0; y <= 512; y += 128) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      if (floorType === "light") {
        ctx.strokeStyle = "#8d8a84";
        ctx.lineWidth = 1.5;
        for (let i = -512; i < 700; i += 120) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.bezierCurveTo(i + 60, 160, i - 40, 320, i + 80, 512);
          ctx.stroke();
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.5, 2.5);

    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      const material = object.material;
      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        if (material.name.toLowerCase().includes("floor_surface")) {
          material.map = texture;
          material.color.set(0xffffff);
          material.roughness = floorType === "light" ? 0.28 : 0.5;
          material.needsUpdate = true;
        }
      }
    });
  }, [floorType]);

  /*
   * =========================
   * WALL
   * =========================
   */

  useEffect(() => {
    const group = floorGroupRef.current;
    if (!group) return;

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors: Record<WallType, string> = {
      white: "#f0f0f0",
      grey: "#888888",
      black: "#222222",
      beige: "#d8c8b0",
    };

    ctx.fillStyle = colors[wallType];
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = wallType === "white" || wallType === "beige" ? "#b8b2aa" : "#555555";
    ctx.lineWidth = 1;

    for (let i = -512; i < 700; i += 90) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.bezierCurveTo(i + 35, 140, i - 35, 320, i + 70, 512);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.5, 1.5);

    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material;
      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        if (material.name.toLowerCase().includes("interior_wall")) {
          material.map = texture;
          material.color.set(0xffffff);
          material.roughness = 0.68;
          material.needsUpdate = true;
        }
      }
    });
  }, [wallType]);

  /*
   * =========================
   * DESIGN WALL
   * =========================
   */

  useEffect(() => {
    const group =
      floorGroupRef.current;

    if (!group) return;

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = 512;
    canvas.height = 512;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    const drawPattern = (
      type: DesignType
    ) => {
      if (type === "classic") {
        ctx.fillStyle = "#3b3b3b";
        ctx.fillRect(
          0,
          0,
          512,
          512
        );

        ctx.strokeStyle = "#777777";
        ctx.lineWidth = 3;

        for (let x = 0; x <= 512; x += 64) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 512);
          ctx.stroke();
        }

        for (let y = 0; y <= 512; y += 64) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(512, y);
          ctx.stroke();
        }
      }

      if (type === "modern") {
        ctx.fillStyle = "#252525";
        ctx.fillRect(
          0,
          0,
          512,
          512
        );

        ctx.strokeStyle = "#b8b0a5";
        ctx.lineWidth = 2;

        for (let i = -512; i < 1024; i += 70) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + 512, 512);
          ctx.stroke();
        }
      }

      if (type === "wood") {
        ctx.fillStyle = "#795548";
        ctx.fillRect(
          0,
          0,
          512,
          512
        );

        ctx.strokeStyle = "#4f3428";
        ctx.lineWidth = 5;

        for (let y = 20; y < 512; y += 34) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(
            130,
            y - 8,
            350,
            y + 8,
            512,
            y - 2
          );
          ctx.stroke();
        }
      }

      if (type === "geometric") {
        ctx.fillStyle = "#202020";
        ctx.fillRect(
          0,
          0,
          512,
          512
        );

        ctx.strokeStyle = "#d7c8b7";
        ctx.lineWidth = 4;

        for (let x = 0; x < 512; x += 86) {
          for (let y = 0; y < 512; y += 86) {
            ctx.strokeRect(
              x + 10,
              y + 10,
              58,
              58
            );
          }
        }
      }

      if (type === "marble") {
        ctx.fillStyle = "#d9d7d2";
        ctx.fillRect(
          0,
          0,
          512,
          512
        );

        ctx.strokeStyle = "#8d8a84";
        ctx.lineWidth = 2;

        for (let i = -512; i < 700; i += 90) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.bezierCurveTo(
            i + 80,
            140,
            i - 60,
            260,
            i + 80,
            512
          );
          ctx.stroke();
        }
      }

      if (type === "sunset") {
        const gradient =
          ctx.createLinearGradient(
            0,
            0,
            512,
            512
          );

        gradient.addColorStop(
          0,
          "#3b3150"
        );
        gradient.addColorStop(
          0.5,
          "#b76545"
        );
        gradient.addColorStop(
          1,
          "#e6b36a"
        );

        ctx.fillStyle =
          gradient;

        ctx.fillRect(
          0,
          0,
          512,
          512
        );
      }
    };

    drawPattern(
      designType
    );

    const texture =
      new THREE.CanvasTexture(
        canvas
      );

    texture.colorSpace =
      THREE.SRGBColorSpace;

    texture.wrapS =
      THREE.RepeatWrapping;

    texture.wrapT =
      THREE.RepeatWrapping;

    group.traverse(
      (object) => {
        if (
          !(object instanceof THREE.Mesh)
        ) {
          return;
        }

        const material =
          object.material;

        if (
          material instanceof
          THREE.MeshStandardMaterial ||
          material instanceof
          THREE.MeshPhysicalMaterial
        ) {
          const name =
            material.name.toLowerCase();

          if (
            name.includes(
              "design_wall"
            )
          ) {
            material.map =
              texture;

            material.color.set(
              0xffffff
            );

            material.needsUpdate =
              true;
          }
        }
      }
    );
  }, [designType]);

  /*
   * =========================
   * CEILING
   * =========================
   */

  useEffect(() => {
    const group = floorGroupRef.current;
    if (!group) return;

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors: Record<CeilingType, string> = {
      white: "#e8e8e8",
      grey: "#777777",
      black: "#222222",
    };

    ctx.fillStyle = colors[ceilingType];
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = ceilingType === "black" ? "#444444" : "#b0b0b0";
    ctx.lineWidth = 3;

    for (let x = 0; x <= 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    for (let y = 0; y <= 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.5, 1.5);

    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material;
      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        if (material.name.toLowerCase().includes("ceiling")) {
          material.map = texture;
          material.color.set(0xffffff);
          material.roughness = 0.4;
          material.needsUpdate = true;
        }
      }
    });
  }, [ceilingType]);

  /*
   * =========================
   * LIGHT
   * =========================
   */

  useEffect(() => {
    const scene =
      sceneRef.current;

    const renderer =
      rendererRef.current;

    if (!scene || !renderer) {
      return;
    }

    const presets: Record<
      LightingMode,
      {
        background: number;
        exposure: number;
        ambient: number;
        hemisphere: number;
        directional: number;
        front: number;
        interior: number;
        interiorColor: number;
      }
    > = {
      day: {
        background: 0x11100f,
        exposure: 1.15,
        ambient: 2.0,
        hemisphere: 1.8,
        directional: 3.0,
        front: 1.5,
        interior: 0.8,
        interiorColor: 0xffffff,
      },
      warm: {
        background: 0x17110d,
        exposure: 1.05,
        ambient: 1.5,
        hemisphere: 1.1,
        directional: 1.8,
        front: 0.9,
        interior: 1.8,
        interiorColor: 0xffc27a,
      },
      night: {
        background: 0x05070d,
        exposure: 0.85,
        ambient: 0.45,
        hemisphere: 0.35,
        directional: 0.35,
        front: 0.25,
        interior: 2.5,
        interiorColor: 0xffd6a3,
      },
    };

    const preset =
      presets[lightingMode];

    scene.background =
      new THREE.Color(
        preset.background
      );

    renderer.toneMappingExposure =
      preset.exposure;

    scene.traverse((object) => {
      if (
        !(object instanceof THREE.Light)
      ) {
        return;
      }

      if (
        object.name ===
        "Ambient_Light"
      ) {
        object.intensity =
          lighting
            ? preset.ambient
            : 0;
      }

      if (
        object.name ===
        "Hemisphere_Light"
      ) {
        object.intensity =
          lighting
            ? preset.hemisphere
            : 0;
      }

      if (
        object.name ===
        "Directional_Light"
      ) {
        object.intensity =
          lighting
            ? preset.directional
            : 0;
      }

      if (
        object.name ===
        "Front_Light"
      ) {
        object.intensity =
          lighting
            ? preset.front
            : 0;
      }

      if (
        object.name ===
        "Interior_Light"
      ) {
        object.intensity =
          lighting
            ? preset.interior *
              (lightIntensity / 80)
            : 0;

        object.color.set(
          preset.interiorColor
        );
      }
    });

    if (lightRef.current) {
      lightRef.current.visible =
        lighting;
    }
  }, [
    lighting,
    lightIntensity,
    lightingMode,
  ]);


  /*
 * =========================
 * WIDTH / DEPTH UPDATE
 * =========================
 */

  useEffect(() => {
    const base =
      baseModuleRef.current;

    const originalSize = originalModuleSizeRef.current;

    const group =
      floorGroupRef.current;

    const camera =
      cameraRef.current;

    if (
      !base ||
      !originalSize ||
      !group ||
      !camera
    ) {
      return;
    }

    const widthScale =
      (width / 1000) /
      originalSize.x;

    const depthScale =
      (depth / 1000) /
      originalSize.z;

    base.scale.x =
      widthScale;

    base.scale.z =
      depthScale;

    createFloors(
      base,
      group,
      floorCount,
      moduleHeightRef.current
    );

    const box =
      new THREE.Box3().setFromObject(
        group
      );

    const size =
      box.getSize(
        new THREE.Vector3()
      );

    const center =
      box.getCenter(
        new THREE.Vector3()
      );

    const maxSize =
      Math.max(
        size.x,
        size.y,
        size.z
      );

    // const distance =
    //   Math.max(
    //     maxSize * 2.2,
    //     6
    //   );

     const distance =
      Math.max(
        maxSize * 1.1,
        6
      );

    animateCameraTo(
      new THREE.Vector3(
        distance,
        Math.max(
          size.y * 0.55,
          3
        ),
        distance
      ),
      center
    );
  }, [
    width,
    depth,
    floorCount
  ]);

  /*
   * =========================
   * DOOR
   * =========================
   */

  useEffect(() => {
    const group =
      floorGroupRef.current;

    if (!group) return;

    group.traverse(
      (object) => {
        if (
          !(object instanceof THREE.Object3D)
        ) {
          return;
        }

        if (
          object.name.includes(
            "Door_Left"
          )
        ) {
          object.position.x =
            doorOpen
              ? -0.48
              : -0.20;
        }

        if (
          object.name.includes(
            "Door_Right"
          )
        ) {
          object.position.x =
            doorOpen
              ? 0.48
              : 0.20;
        }
      }
    );
  }, [doorOpen]);

  /*
   * =========================
   * CAMERA PRESETS
   * =========================
   */

  const setCameraPreset = (preset: CameraPreset) => {
    const camera = cameraRef.current;
    const group = floorGroupRef.current;
    const controls = controlsRef.current;

    if (!camera || !group || !controls) return;

    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z);

    let position = new THREE.Vector3();
    let target = center.clone();

    if (preset === "full") {
      const distance = Math.max(max * 2.2, 6);
      position.set(distance, Math.max(size.y * 0.55, 3), distance);
    }

    if (preset === "front") {
      const distance = Math.max(max * 1.7, 4.5);
      position.set(0, Math.max(center.y, 2.5), distance);
      target.set(0, center.y, 0);
    }

    if (preset === "interior") {
      const distance = Math.max(Math.min(size.x, size.z) * 0.75, 1.8);
      position.set(0, Math.max(center.y, 2.2), distance);
      target.set(0, center.y, 0);
    }

    if (preset === "floor") {
      const distance = Math.max(max * 0.9, 2.8);
      position.set(distance * 0.75, 1.1, distance * 0.75);
      target.set(0, 0.35, 0);
    }

    if (preset === "ceiling") {
      const distance = Math.max(max * 0.9, 2.8);
      position.set(distance * 0.7, Math.max(size.y * 0.9, 3.5), distance * 0.7);
      target.set(0, Math.max(box.max.y - 0.25, 2.5), 0);
    }

    camera.position.copy(position);
    controls.target.copy(target);
    camera.lookAt(target);
    controls.update();
  };

  /*
   * =========================
   * RESET
   * =========================
   */

  const resetConfiguration =
    () => {
      setFloorCount(2);
      setWidth(1100);
      setDepth(1400);
      setFloorHeight(2500);
      setCeilingHeight(2400);

      setFrameColor("#3a3a3a");

      setGlassType("clear");

      setFloorType("dark");

      setWallType("white");

      setDesignType("classic");

      setCeilingType("white");

      setLighting(true);

      setLightIntensity(80);

      setDoorOpen(false);

      setArchitectMode(false);
    };

  /*
   * =========================
   * SAVE
   * =========================
   */

  const saveConfiguration =
    () => {
      const configuration = {
        floorCount,
        width,
        depth,
        floorHeight,
        ceilingHeight,
        frameColor,
        glassType,
        floorType,
        wallType,
        designType,
        ceilingType,
        lighting,
        lightIntensity,
        doorOpen,
      };

      localStorage.setItem(
        "elevator-config",
        JSON.stringify(
          configuration
        )
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2000);
    };

  /*
   * =========================
   * SHARE
   * =========================
   */

  const shareConfiguration =
    async () => {
      const data =
        JSON.stringify({
          floorCount,
          width,
          depth,
          floorHeight,
          ceilingHeight,
          frameColor,
          glassType,
          floorType,
          wallType,
          designType,
          ceilingType,
        });

      const encoded =
        btoa(data);

      const url =
        `${window.location.origin}${window.location.pathname}?config=${encoded}`;

      try {
        await navigator.clipboard.writeText(
          url
        );

        alert(
          "Configuration link copied!"
        );
      } catch {
        alert(
          "Unable to copy link."
        );
      }
    };

  /*
   * =========================
   * PRICE
   * =========================
   */

  const basePrice =
    650000;

  const floorPrice =
    (floorCount - 2) *
    85000;

  const sizePrice =
    width > 1100
      ? 45000
      : 0;

  const totalPrice =
    basePrice +
    floorPrice +
    sizePrice;

  /*
   * =========================
   * UI
   * =========================
   */

  return (
    <div className="app">

      {/* HEADER */}

      <header className="topbar">

        <div className="brand">
          <div className="brand-mark">
            △
          </div>

          <div className="brand-name">
            ALPHA<span>LAB</span>
          </div>
        </div>

        <nav className="product-nav">

          <button className="product active">
            HOME LIFT
          </button>

          <button className="product">
            COMPACT
          </button>

          <button className="product">
            ACCESS
          </button>

          <button className="product">
            PUBLIC LIFT
          </button>

        </nav>

        <div className="header-actions">

          <button
            className="header-icon"
            onClick={saveConfiguration}
          >
            {saved
              ? "SAVED"
              : "SAVE"}
          </button>

          <button
            className="header-icon"
            onClick={
              shareConfiguration
            }
          >
            SHARE
          </button>

          <button
            className="price-button"
            onClick={() =>
              alert(
                `Estimated price: ₹${totalPrice.toLocaleString(
                  "en-IN"
                )}`
              )
            }
          >
            GET A PRICE ESTIMATE
          </button>

        </div>

      </header>

      {/* MAIN */}

      <main className="main">

        {/* LEFT */}

        <section className="left-panel">

          <div className="info-card">

            <h1>
              HOME LIFT
            </h1>

            <p>
              Create your own
              personalised home lift.
              Configure dimensions,
              colours, glass, interior
              finishes and lighting.
            </p>

            <div className="feature">

              <span>01</span>

              <div>
                <strong>
                  CUSTOM DESIGN
                </strong>

                <small>
                  Designed around your
                  space.
                </small>
              </div>

            </div>

            <div className="feature">

              <span>02</span>

              <div>
                <strong>
                  3D CONFIGURATION
                </strong>

                <small>
                  See changes instantly.
                </small>
              </div>

            </div>

            <div className="feature">

              <span>03</span>

              <div>
                <strong>
                  YOUR CHOICE
                </strong>

                <small>
                  Select every finish.
                </small>
              </div>

            </div>

            <button className="read-more">
              READ MORE →
            </button>

          </div>

          <button
            className="reset-button"
            onClick={
              resetConfiguration
            }
          >
            ↻ RESET CONFIGURATION
          </button>

        </section>

        {/* 3D */}

        <section className="viewer">

          <div
            ref={containerRef}
            className="three-container"
          />

          <div className="viewer-top">

            <span>
              {floorCount} FLOORS
            </span>

            <span>
              {width} × {depth} MM
            </span>

          </div>

          <div className="viewer-hint">

            <span>↻</span>

            DRAG TO ROTATE

            <span>•</span>

            SCROLL TO ZOOM

          </div>

          <div className="camera-presets">
            {[
              ["full", "FULL VIEW"],
              ["front", "FRONT"],
              ["interior", "INTERIOR"],
              ["floor", "FLOOR"],
              ["ceiling", "CEILING"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setCameraPreset(value as CameraPreset)
                }
              >
                {label}
              </button>
            ))}
          </div>

          {architectMode && (
            <div className="dimension-overlay">

              <div>
                WIDTH
                <strong>
                  {width} mm
                </strong>
              </div>

              <div>
                DEPTH
                <strong>
                  {depth} mm
                </strong>
              </div>

              <div>
                HEIGHT
                <strong>
                  {floorHeight *
                    floorCount}
                  mm
                </strong>
              </div>

            </div>
          )}

        </section>

        {/* RIGHT */}

        <aside className="config-panel">

          <div className="config-title">

            <div>
              <span>
                CONFIGURATOR
              </span>

              <h2>
                Configure Lift
              </h2>
            </div>

            <div className="price-mini">
              ₹
              {totalPrice.toLocaleString(
                "en-IN"
              )}
            </div>

          </div>

          {/* CONSTRUCTION */}

          <div className="accordion">

            <button
              className={`accordion-header ${activeSection ===
                "construction"
                ? "open"
                : ""
                }`}
              onClick={() =>
                setActiveSection(
                  activeSection ===
                    "construction"
                    ? null
                    : "construction"
                )
              }
            >

              <span className="step">
                01
              </span>

              <span>
                CONSTRUCTION
              </span>

              <span className="arrow">
                {activeSection ===
                  "construction"
                  ? "−"
                  : "+"}
              </span>

            </button>

            {activeSection ===
              "construction" && (

                <div className="accordion-content">

                  <label>
                    Number of floors
                  </label>

                  <div className="floor-buttons">

                    {[2, 3, 4, 5, 6].map(
                      (floor) => (

                        <button
                          key={floor}
                          className={
                            floorCount ===
                              floor
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            setFloorCount(
                              floor
                            )
                          }
                        >
                          {floor}
                        </button>

                      )
                    )}

                  </div>

                  <label>
                    Width
                  </label>

                  <div className="range-line">

                    <input
                      type="range"
                      min="900"
                      max="1400"
                      step="50"
                      value={width}
                      onChange={(e) =>
                        setWidth(
                          Number(
                            e.target.value
                          )
                        )
                      }
                    />

                    <strong>
                      {width} mm
                    </strong>

                  </div>

                  <label>
                    Depth
                  </label>

                  <div className="range-line">

                    <input
                      type="range"
                      min="1000"
                      max="1600"
                      step="50"
                      value={depth}
                      onChange={(e) =>
                        setDepth(
                          Number(
                            e.target.value
                          )
                        )
                      }
                    />

                    <strong>
                      {depth} mm
                    </strong>

                  </div>

                  <label>
                    Floor height
                  </label>

                  <div className="number-input">

                    <input
                      type="number"
                      min="2000"
                      max="3500"
                      step="50"
                      value={floorHeight}
                      onChange={(e) =>
                        setFloorHeight(
                          Number(
                            e.target.value
                          )
                        )
                      }
                    />

                    <span>MM</span>

                  </div>

                  <label>
                    Ceiling height
                  </label>

                  <div className="number-input">

                    <input
                      type="number"
                      min="2000"
                      max="3000"
                      step="50"
                      value={
                        ceilingHeight
                      }
                      onChange={(e) =>
                        setCeilingHeight(
                          Number(
                            e.target.value
                          )
                        )
                      }
                    />

                    <span>MM</span>

                  </div>

                  <div className="calculation">

                    <span>
                      TRAVEL HEIGHT
                    </span>

                    <strong>
                      {(
                        floorHeight *
                        (floorCount - 1)
                      ).toLocaleString()}{" "}
                      mm
                    </strong>

                  </div>

                </div>
              )}

          </div>

          {/* EXTERIOR */}

          <div className="accordion">

            <button
              className={`accordion-header ${activeSection ===
                "exterior"
                ? "open"
                : ""
                }`}
              onClick={() =>
                setActiveSection(
                  activeSection ===
                    "exterior"
                    ? null
                    : "exterior"
                )
              }
            >

              <span className="step">
                02
              </span>

              <span>
                EXTERIOR
              </span>

              <span className="arrow">
                {activeSection ===
                  "exterior"
                  ? "−"
                  : "+"}
              </span>

            </button>

            {activeSection ===
              "exterior" && (

                <div className="accordion-content">

                  <label>
                    Frame colour
                  </label>

                  <div className="color-options">

                    {[
                      [
                        "#222222",
                        "Black",
                      ],
                      [
                        "#f0f0f0",
                        "White",
                      ],
                      [
                        "#777777",
                        "Grey",
                      ],
                      [
                        "#9b7652",
                        "Bronze",
                      ],
                      [
                        "#1d3030",
                        "Green",
                      ],
                    ].map(
                      ([color, name]) => (

                        <button
                          key={color}
                          className={`color-dot ${frameColor ===
                            color
                            ? "selected-color"
                            : ""
                            }`}
                          title={name}
                          style={{
                            background:
                              color,
                          }}
                          onClick={() =>
                            setFrameColor(
                              color
                            )
                          }
                        />

                      )
                    )}

                  </div>

                  <label>
                    Glass finish
                  </label>

                  <div className="choice-grid">

                    {[
                      ["clear", "Clear"],
                      [
                        "tinted",
                        "Tinted",
                      ],
                      ["mesh", "Mesh"],
                      [
                        "diamond",
                        "Diamond",
                      ],
                    ].map(
                      ([value, name]) => (

                        <button
                          key={value}
                          className={
                            glassType ===
                              value
                              ? "choice active-choice"
                              : "choice"
                          }
                          onClick={() =>
                            setGlassType(
                              value as GlassType
                            )
                          }
                        >
                          {name}
                        </button>

                      )
                    )}

                  </div>

                  <label>
                    Door
                  </label>

                  <button
                    className={`wide-option ${doorOpen
                      ? "active-option"
                      : ""
                      }`}
                    onClick={() =>
                      setDoorOpen(
                        !doorOpen
                      )
                    }
                  >
                    {doorOpen
                      ? "CLOSE DOOR"
                      : "OPEN DOOR"}
                  </button>

                </div>
              )}

          </div>

          {/* INTERIOR */}

          <div className="accordion">

            <button
              className={`accordion-header ${activeSection ===
                "interior"
                ? "open"
                : ""
                }`}
              onClick={() =>
                setActiveSection(
                  activeSection ===
                    "interior"
                    ? null
                    : "interior"
                )
              }
            >

              <span className="step">
                03
              </span>

              <span>
                INTERIOR
              </span>

              <span className="arrow">
                {activeSection ===
                  "interior"
                  ? "−"
                  : "+"}
              </span>

            </button>

            {activeSection ===
              "interior" && (

                <div className="accordion-content">

                  <label>
                    Flooring
                  </label>

                  <div className="choice-grid">

                    {[
                      ["dark", "Dark"],
                      ["grey", "Grey"],
                      [
                        "light",
                        "Light",
                      ],
                      ["wood", "Wood"],
                    ].map(
                      ([value, name]) => (

                        <button
                          key={value}
                          className={
                            floorType ===
                              value
                              ? "choice active-choice"
                              : "choice"
                          }
                          onClick={() => {
                            setFloorType(
                              value as FloorType
                            );
                            setTimeout(
                              () => focusOnFeature("floor_surface"),
                              0
                            );
                          }}
                        >
                          {name}
                        </button>

                      )
                    )}

                  </div>

                  <label>
                    Interior wall
                  </label>

                  <div className="choice-grid">

                    {[
                      ["white", "White"],
                      ["grey", "Grey"],
                      ["black", "Black"],
                      ["beige", "Beige"],
                    ].map(
                      ([value, name]) => (

                        <button
                          key={value}
                          className={
                            wallType ===
                              value
                              ? "choice active-choice"
                              : "choice"
                          }
                          onClick={() => {
                            setWallType(
                              value as WallType
                            );
                            setTimeout(
                              () => focusOnFeature("interior_wall"),
                              0
                            );
                          }}
                        >
                          {name}
                        </button>

                      )
                    )}

                  </div>

                  <label>
                    Design wall
                  </label>

                  <div className="choice-grid">

                    {[
                      [
                        "classic",
                        "Classic",
                      ],
                      [
                        "modern",
                        "Modern",
                      ],
                      ["wood", "Wood"],
                      [
                        "geometric",
                        "Geometric",
                      ],
                      [
                        "marble",
                        "Marble",
                      ],
                      [
                        "sunset",
                        "Sunset",
                      ],
                    ].map(
                      ([value, name]) => (

                        <button
                          key={value}
                          className={
                            designType ===
                              value
                              ? "choice active-choice"
                              : "choice"
                          }
                          onClick={() => {
                            setDesignType(
                              value as DesignType
                            );
                            setTimeout(
                              () => focusOnFeature("design_wall"),
                              0
                            );
                          }}
                        >
                          {name}
                        </button>

                      )
                    )}

                  </div>

                  <label>
                    Ceiling
                  </label>

                  <div className="choice-grid">

                    {[
                      ["white", "White"],
                      ["grey", "Grey"],
                      ["black", "Black"],
                    ].map(
                      ([value, name]) => (

                        <button
                          key={value}
                          className={
                            ceilingType ===
                              value
                              ? "choice active-choice"
                              : "choice"
                          }
                          onClick={() => {
                            setCeilingType(
                              value as CeilingType
                            );
                            setTimeout(
                              () => focusOnFeature("ceiling"),
                              0
                            );
                          }}
                        >
                          {name}
                        </button>

                      )
                    )}

                  </div>

                  <label>
                    Lighting
                  </label>

                  <div className="choice-grid">
                    {[
                      ["day", "Day"],
                      ["warm", "Warm Evening"],
                      ["night", "Night"],
                    ].map(
                      ([value, name]) => (
                        <button
                          key={value}
                          className={
                            lightingMode ===
                            value
                              ? "choice active-choice"
                              : "choice"
                          }
                          onClick={() =>
                            setLightingMode(
                              value as LightingMode
                            )
                          }
                        >
                          {name}
                        </button>
                      )
                    )}
                  </div>

                  <div className="lighting-row">

                    <button
                      className={
                        lighting
                          ? "toggle on"
                          : "toggle"
                      }
                      onClick={() =>
                        setLighting(
                          !lighting
                        )
                      }
                    >
                      <span />
                    </button>

                    <span>
                      {lighting
                        ? "ON"
                        : "OFF"}
                    </span>

                  </div>

                  {lighting && (

                    <div className="range-line">

                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={
                          lightIntensity
                        }
                        onChange={(e) =>
                          setLightIntensity(
                            Number(
                              e.target.value
                            )
                          )
                        }
                      />

                      <strong>
                        {lightIntensity}%
                      </strong>

                    </div>

                  )}

                </div>
              )}

          </div>

          {/* ARCHITECT */}

          <div className="accordion">

            <button
              className={`accordion-header ${activeSection ===
                "architect"
                ? "open"
                : ""
                }`}
              onClick={() => {
                setActiveSection(
                  activeSection ===
                    "architect"
                    ? null
                    : "architect"
                );

                setArchitectMode(
                  !architectMode
                );
              }}
            >

              <span className="step">
                04
              </span>

              <span>
                FOR ARCHITECTS
              </span>

              <span className="arrow">
                {activeSection ===
                  "architect"
                  ? "−"
                  : "+"}
              </span>

            </button>

            {activeSection ===
              "architect" && (

                <div className="accordion-content">

                  <div className="architect-info">

                    <strong>
                      DIMENSIONS
                    </strong>

                    <span>
                      Width: {width} mm
                    </span>

                    <span>
                      Depth: {depth} mm
                    </span>

                    <span>
                      Total height:{" "}
                      {(
                        floorHeight *
                        floorCount
                      ).toLocaleString()}{" "}
                      mm
                    </span>

                  </div>

                  <button
                    className="wide-option"
                    onClick={() =>
                      alert(
                        "PNG generation will be connected next."
                      )
                    }
                  >
                    GENERATE PNG
                  </button>

                  <button
                    className="wide-option"
                    onClick={() =>
                      alert(
                        "GLB export will be connected next."
                      )
                    }
                  >
                    GENERATE GLB
                  </button>

                </div>
              )}

          </div>

          {/* AR */}

          <button className="simple-option">

            <span>
              SEE YOUR LIFT IN AR
            </span>

            <span>
              ↗
            </span>

          </button>

          {/* SHARE */}

          <button
            className="share-button"
            onClick={
              shareConfiguration
            }
          >
            SHARE CONFIGURATION
            <span>
              ↗
            </span>
          </button>

        </aside>

      </main>

      {/* BOTTOM */}

      <footer className="bottom-bar">

        <span>
          ◉ ENGLISH
        </span>

        <span>
          {floorCount} FLOOR HOME LIFT
        </span>

        <span>
          CONFIGURATION READY
        </span>

      </footer>

    </div>
  );
}

/*
 * =========================
 * CREATE FLOORS
 * =========================
 */

function createFloors(
  base: THREE.Group,
  group: THREE.Group,
  count: number,
  height: number
) {
  while (
    group.children.length
  ) {
    group.remove(
      group.children[0]
    );
  }

  for (
    let i = 0;
    i < count;
    i++
  ) {
    const module =
      base.clone(true);

    module.name =
      `Floor_Module_${i + 1}`;

    module.position.y =
      i * height;

    group.add(
      module
    );
  }
}

/*
 * =========================
 * CAMERA
 * =========================
 */

function fitCamera(
  camera: THREE.PerspectiveCamera,
  group: THREE.Group
) {
  const box =
    new THREE.Box3().setFromObject(
      group
    );

  const size =
    box.getSize(
      new THREE.Vector3()
    );

  const center =
    box.getCenter(
      new THREE.Vector3()
    );

  // const max =
  //   Math.max(
  //     size.x,
  //     size.y,
  //     size.z
  //   );

 const distance = Math.max(size.x, size.y, size.z) * 1.3;

  camera.position.set(
    distance,
    Math.max(
      size.y * 0.55,
      3
    ),
    distance
  );

  camera.lookAt(
    center.x,
    center.y,
    center.z
  );
}

export default App;