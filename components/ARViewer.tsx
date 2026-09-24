import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ARButton } from "three/addons/webxr/ARButton.js";

type ARViewerProps = {
  modelUrl?: string;
};

export default function ARViewer({
  modelUrl = "/models/Elevator_Master.glb",
}: ARViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [supported, setSupported] = useState<boolean | null>(null);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;

    let reticle: THREE.Mesh | null = null;
    let elevator: THREE.Group | null = null;

    let hitTestSource: XRHitTestSource | null = null;
    let viewerSpace: XRReferenceSpace | null = null;
    let xrSession: XRSession | null = null;

    let handleResize: (() => void) | null = null;
    let handleTap: (() => void) | null = null;
    let handleSessionEnd: (() => void) | null = null;

    const initAR = async () => {
      // ==========================================
      // CHECK WEBXR
      // ==========================================

      if (!navigator.xr) {
        setSupported(false);
        setError(
          "WebXR is not available in this browser."
        );
        return;
      }

      try {
        const isSupported =
          await navigator.xr.isSessionSupported(
            "immersive-ar"
          );

        setSupported(isSupported);

        if (!isSupported) {
          setError(
            "Immersive AR is not supported on this device/browser."
          );
          return;
        }

        // ==========================================
        // SCENE
        // ==========================================

        scene = new THREE.Scene();

        // ==========================================
        // CAMERA
        // ==========================================

        camera = new THREE.PerspectiveCamera(
          70,
          window.innerWidth / window.innerHeight,
          0.01,
          100
        );

        // ==========================================
        // RENDERER
        // ==========================================

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
        });

        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio, 2)
        );

        renderer.setSize(
          window.innerWidth,
          window.innerHeight
        );

        renderer.xr.enabled = true;

        renderer.setClearAlpha(0);

        container.appendChild(
          renderer.domElement
        );

        // ==========================================
        // LIGHTING
        // ==========================================

        const ambientLight =
          new THREE.AmbientLight(
            0xffffff,
            2
          );

        scene.add(ambientLight);

        const directionalLight =
          new THREE.DirectionalLight(
            0xffffff,
            2
          );

        directionalLight.position.set(
          5,
          10,
          5
        );

        scene.add(directionalLight);

        // ==========================================
        // RETICLE
        // ==========================================

        const reticleGeometry =
          new THREE.RingGeometry(
            0.08,
            0.1,
            32
          );

        const reticleMaterial =
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
          });

        reticle = new THREE.Mesh(
          reticleGeometry,
          reticleMaterial
        );

        reticle.rotation.x =
          -Math.PI / 2;

        reticle.matrixAutoUpdate = false;

        reticle.visible = false;

        scene.add(reticle);

        // ==========================================
        // LOAD ELEVATOR GLB
        // ==========================================

        const loader = new GLTFLoader();

        loader.load(
          modelUrl,

          (gltf) => {
            if (!scene) {
              return;
            }

            elevator = gltf.scene;

            elevator.visible = false;

            // --------------------------------------
            // Get original model size
            // --------------------------------------

            const originalBox =
              new THREE.Box3().setFromObject(
                elevator
              );

            const originalSize =
              new THREE.Vector3();

            originalBox.getSize(
              originalSize
            );

            console.log(
              "Original elevator size:",
              originalSize
            );

            // --------------------------------------
            // Target AR height
            // --------------------------------------

            const targetHeight = 2.5;

            if (originalSize.y > 0) {
              const scale =
                targetHeight /
                originalSize.y;

              elevator.scale.setScalar(
                scale
              );
            }

            // --------------------------------------
            // Center model
            // --------------------------------------

            const scaledBox =
              new THREE.Box3().setFromObject(
                elevator
              );

            const center =
              new THREE.Vector3();

            scaledBox.getCenter(center);

            elevator.position.x -=
              center.x;

            elevator.position.z -=
              center.z;

            // --------------------------------------
            // Put bottom on floor
            // --------------------------------------

            const finalBox =
              new THREE.Box3().setFromObject(
                elevator
              );

            elevator.position.y -=
              finalBox.min.y;

            scene.add(elevator);

            console.log(
              "Elevator model loaded successfully"
            );
          },

          undefined,

          (loadError) => {
            console.error(
              "GLB loading error:",
              loadError
            );

            setError(
              "Failed to load the elevator 3D model."
            );
          }
        );

        // ==========================================
        // AR BUTTON
        // ==========================================

        const arButton =
          ARButton.createButton(
            renderer,
            {
              requiredFeatures: [
                "hit-test",
              ],

              optionalFeatures: [
                "dom-overlay",
              ],
            }
          );

        arButton.style.position =
          "absolute";

        arButton.style.bottom =
          "30px";

        arButton.style.left =
          "50%";

        arButton.style.transform =
          "translateX(-50%)";

        arButton.style.zIndex =
          "100";

        container.appendChild(
          arButton
        );

        // ==========================================
        // AR SESSION START
        // ==========================================

        renderer.xr.addEventListener(
          "sessionstart",
          async () => {
            if (!renderer) {
              return;
            }

            xrSession =
              renderer.xr.getSession();

            if (!xrSession) {
              return;
            }

            // --------------------------------------
            // Check hit test API
            // --------------------------------------

            if (
              !xrSession.requestHitTestSource
            ) {
              setError(
                "Hit test is not supported on this device."
              );

              return;
            }

            try {
              // ------------------------------------
              // Viewer reference space
              // ------------------------------------

              viewerSpace =
                await xrSession.requestReferenceSpace(
                  "viewer"
                );

              // ------------------------------------
              // Request hit test source
              // ------------------------------------

              const source =
                await xrSession.requestHitTestSource(
                  {
                    space: viewerSpace,
                  }
                );

              // ------------------------------------
              // TypeScript safety check
              // ------------------------------------

              if (!source) {
                setError(
                  "Unable to create AR hit test source."
                );

                return;
              }

              hitTestSource = source;

              console.log(
                "AR hit test started"
              );
            } catch (error) {
              console.error(
                "Hit test initialization failed:",
                error
              );

              setError(
                "Surface detection is not available."
              );
            }
          }
        );

        // ==========================================
        // AR SESSION END
        // ==========================================

        handleSessionEnd = () => {
          hitTestSource?.cancel();

          hitTestSource = null;

          viewerSpace = null;

          xrSession = null;

          if (elevator) {
            elevator.visible = false;
          }

          if (reticle) {
            reticle.visible = false;
          }

          setPlaced(false);
        };

        renderer.xr.addEventListener(
          "sessionend",
          handleSessionEnd
        );

        // ==========================================
        // TAP TO PLACE
        // ==========================================

        handleTap = () => {
          if (!renderer) {
            return;
          }

          if (!renderer.xr.isPresenting) {
            return;
          }

          if (!reticle) {
            return;
          }

          if (!reticle.visible) {
            return;
          }

          if (!elevator) {
            return;
          }

          // ----------------------------------------
          // Position
          // ----------------------------------------

          const position =
            new THREE.Vector3();

          // ----------------------------------------
          // Rotation
          // ----------------------------------------

          const quaternion =
            new THREE.Quaternion();

          // ----------------------------------------
          // Scale
          // ----------------------------------------

          const scale =
            new THREE.Vector3();

          reticle.matrix.decompose(
            position,
            quaternion,
            scale
          );

          // ----------------------------------------
          // Place elevator
          // ----------------------------------------

          elevator.position.copy(
            position
          );

          elevator.quaternion.copy(
            quaternion
          );

          elevator.visible = true;

          setPlaced(true);

          console.log(
            "Elevator placed:",
            position
          );
        };

        renderer.domElement.addEventListener(
          "click",
          handleTap
        );

        // ==========================================
        // RESIZE
        // ==========================================

        handleResize = () => {
          if (!renderer || !camera) {
            return;
          }

          camera.aspect =
            window.innerWidth /
            window.innerHeight;

          camera.updateProjectionMatrix();

          renderer.setSize(
            window.innerWidth,
            window.innerHeight
          );
        };

        window.addEventListener(
          "resize",
          handleResize
        );

        // ==========================================
        // AR RENDER LOOP
        // ==========================================

        renderer.setAnimationLoop(
          (
            _time: number,
            frame?: XRFrame
          ) => {
            // --------------------------------------
            // Hit test
            // --------------------------------------

            if (
              frame &&
              hitTestSource &&
              renderer
            ) {
              const referenceSpace =
                renderer.xr.getReferenceSpace();

              if (referenceSpace) {
                const hitTestResults =
                  frame.getHitTestResults(
                    hitTestSource
                  );

                if (
                  hitTestResults.length > 0
                ) {
                  const hit =
                    hitTestResults[0];

                  const pose =
                    hit.getPose(
                      referenceSpace
                    );

                  if (
                    pose &&
                    reticle
                  ) {
                    reticle.visible =
                      true;

                    reticle.matrix.fromArray(
                      pose.transform.matrix
                    );
                  }
                } else if (reticle) {
                  reticle.visible =
                    false;
                }
              }
            }

            // --------------------------------------
            // Render
            // --------------------------------------

            if (
              scene &&
              camera &&
              renderer
            ) {
              renderer.render(
                scene,
                camera
              );
            }
          }
        );
      } catch (error) {
        console.error(
          "AR initialization error:",
          error
        );

        setSupported(false);

        setError(
          "Unable to initialize AR."
        );
      }
    };

    // ==========================================
    // START AR
    // ==========================================

    initAR();

    // ==========================================
    // CLEANUP
    // ==========================================

    return () => {
      // Resize listener
      if (handleResize) {
        window.removeEventListener(
          "resize",
          handleResize
        );
      }

      // Tap listener
      if (
        renderer &&
        handleTap
      ) {
        renderer.domElement.removeEventListener(
          "click",
          handleTap
        );
      }

      // Session listener
      if (
        renderer &&
        handleSessionEnd
      ) {
        renderer.xr.removeEventListener(
          "sessionend",
          handleSessionEnd
        );
      }

      // Cancel hit test
      hitTestSource?.cancel();

      hitTestSource = null;

      // End AR session
      if (
        xrSession &&
        renderer?.xr.isPresenting
      ) {
        xrSession.end();
      }

      // Stop animation
      renderer?.setAnimationLoop(null);

      // Dispose Three.js objects
      if (scene) {
        scene.traverse((object) => {
          const mesh =
            object as THREE.Mesh;

          if (mesh.geometry) {
            mesh.geometry.dispose();
          }

          if (mesh.material) {
            const materials =
              Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material];

            materials.forEach(
              (material) => {
                material.dispose();
              }
            );
          }
        });
      }

      // Dispose renderer
      renderer?.dispose();

      // Remove canvas
      if (
        renderer?.domElement.parentElement ===
        container
      ) {
        container.removeChild(
          renderer.domElement
        );
      }

      // Remove AR button
      const buttons =
        container.querySelectorAll(
          "button"
        );

      buttons.forEach((button) => {
        button.remove();
      });
    };
  }, [modelUrl]);

  // ==========================================
  // UI
  // ==========================================

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "transparent",
        zIndex: 9999,
      }}
    >
      {/* ========================================
          INSTRUCTIONS
      ======================================== */}

      {supported === true &&
        !placed &&
        !error && (
          <div
            style={{
              position: "absolute",
              top: 20,
              left: "50%",
              transform:
                "translateX(-50%)",
              zIndex: 200,
              width:
                "calc(100% - 40px)",
              maxWidth: 400,
              padding:
                "12px 18px",
              borderRadius: 12,
              background:
                "rgba(0,0,0,0.75)",
              color: "#fff",
              fontSize: 14,
              lineHeight: 1.4,
              textAlign: "center",
              pointerEvents:
                "none",
            }}
          >
            Move your phone slowly
            to detect the floor.
            Then tap the white
            circle to place the
            elevator.
          </div>
        )}

      {/* ========================================
          PLACED MESSAGE
      ======================================== */}

      {placed && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform:
              "translateX(-50%)",
            zIndex: 200,
            padding:
              "10px 16px",
            borderRadius: 10,
            background:
              "rgba(0,0,0,0.75)",
            color: "#fff",
            fontSize: 13,
            pointerEvents:
              "none",
            whiteSpace:
              "nowrap",
          }}
        >
          Elevator placed successfully
        </div>
      )}

      {/* ========================================
          ERROR
      ======================================== */}

      {error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform:
              "translate(-50%, -50%)",
            zIndex: 300,
            width:
              "min(90%, 380px)",
            padding: 22,
            borderRadius: 16,
            background:
              "rgba(0,0,0,0.92)",
            color: "#fff",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            AR Not Available
          </div>

          <div
            style={{
              fontSize: 13,
              opacity: 0.8,
            }}
          >
            {error}
          </div>
        </div>
      )}
    </div>
  );
}