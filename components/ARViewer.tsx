import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ARButton } from "three/addons/webxr/ARButton.js";

interface ARViewerProps {
  modelUrl?: string;
  onExit?: () => void;
}

export default function ARViewer({
  modelUrl = "/models/Elevator_Master.glb",
  onExit,
}: ARViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isSupported, setIsSupported] = useState<boolean | null>(
    null
  );

  const [isPlaced, setIsPlaced] = useState(false);

  const [message, setMessage] = useState(
    "Move your phone slowly to detect the floor."
  );

  const [error, setError] = useState("");

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;

    let reticle: THREE.Mesh | null = null;
    let elevator: THREE.Group | null = null;

    let arButton: HTMLElement | null = null;

    // WebXR objects
    let xrSession: XRSession | null = null;
    let hitTestSource: XRHitTestSource | null = null;
    let viewerSpace: XRReferenceSpace | null = null;

    let cancelled = false;

    // --------------------------------------------------
    // Initialize
    // --------------------------------------------------

    const initialize = async () => {
      try {
        // ----------------------------------------------
        // Check WebXR
        // ----------------------------------------------

        if (!("xr" in navigator)) {
          setIsSupported(false);
          setError(
            "WebXR is not available in this browser."
          );
          return;
        }

        const xr = navigator.xr;

        const supported =
          await xr.isSessionSupported("immersive-ar");

        if (cancelled) return;

        setIsSupported(supported);

        if (!supported) {
          setError(
            "Immersive AR is not supported on this device."
          );
          return;
        }

        // ----------------------------------------------
        // Scene
        // ----------------------------------------------

        scene = new THREE.Scene();

        // ----------------------------------------------
        // Camera
        // ----------------------------------------------

        camera = new THREE.PerspectiveCamera(
          70,
          window.innerWidth / window.innerHeight,
          0.01,
          100
        );

        // ----------------------------------------------
        // Renderer
        // ----------------------------------------------

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });

        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio, 2)
        );

        renderer.setSize(
          window.innerWidth,
          window.innerHeight
        );

        renderer.xr.enabled = true;

        // Important for AR
        renderer.xr.setReferenceSpaceType(
          "local-floor"
        );

        renderer.setClearAlpha(0);

        container.appendChild(
          renderer.domElement
        );

        // ----------------------------------------------
        // Lights
        // ----------------------------------------------

        const ambientLight =
          new THREE.HemisphereLight(
            0xffffff,
            0x444444,
            2
          );

        scene.add(ambientLight);

        const directionalLight =
          new THREE.DirectionalLight(
            0xffffff,
            2
          );

        directionalLight.position.set(
          3,
          8,
          4
        );

        scene.add(directionalLight);

        // ----------------------------------------------
        // Reticle
        // ----------------------------------------------

        const reticleGeometry =
          new THREE.RingGeometry(
            0.08,
            0.105,
            32
          );

        const reticleMaterial =
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
          });

        reticle = new THREE.Mesh(
          reticleGeometry,
          reticleMaterial
        );

        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        reticle.renderOrder = 999;

        scene.add(reticle);

        // ----------------------------------------------
        // Load Elevator GLB
        // ----------------------------------------------

        const loader = new GLTFLoader();

        loader.load(
          modelUrl,
          (gltf) => {
            if (cancelled) return;

            elevator = gltf.scene;

            // ------------------------------------------
            // Find original dimensions
            // ------------------------------------------

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

            // ------------------------------------------
            // AR target height
            //
            // WebXR uses meters.
            // Elevator target = 2.5 meters.
            // ------------------------------------------

            const targetHeight = 2.5;

            if (originalSize.y > 0) {
              const scale =
                targetHeight /
                originalSize.y;

              elevator.scale.setScalar(
                scale
              );
            }

            // ------------------------------------------
            // Recalculate bounding box
            // ------------------------------------------

            const scaledBox =
              new THREE.Box3().setFromObject(
                elevator
              );

            const center =
              new THREE.Vector3();

            scaledBox.getCenter(center);

            // Center X/Z
            elevator.position.x -=
              center.x;

            elevator.position.z -=
              center.z;

            // Put bottom on floor
            const finalBox =
              new THREE.Box3().setFromObject(
                elevator
              );

            elevator.position.y -=
              finalBox.min.y;

            // ------------------------------------------
            // Initially hidden
            // ------------------------------------------

            elevator.visible = false;

            scene?.add(elevator);

            console.log(
              "Elevator model loaded"
            );
          },
          undefined,
          (error) => {
            console.error(
              "GLB loading error:",
              error
            );

            setError(
              "Unable to load Elevator_Master.glb"
            );
          }
        );

        // ----------------------------------------------
        // AR Button
        // ----------------------------------------------

        arButton = ARButton.createButton(
          renderer,
          {
            requiredFeatures: [
              "hit-test",
            ],
            optionalFeatures: [
              "local-floor",
              "dom-overlay",
            ],
          }
        );

        // Style AR button
        arButton.style.position =
          "absolute";

        arButton.style.bottom =
          "24px";

        arButton.style.left =
          "50%";

        arButton.style.transform =
          "translateX(-50%)";

        arButton.style.zIndex =
          "1000";

        arButton.style.padding =
          "14px 28px";

        arButton.style.border =
          "1px solid white";

        arButton.style.borderRadius =
          "8px";

        arButton.style.background =
          "rgba(0,0,0,0.75)";

        arButton.style.color =
          "white";

        arButton.style.fontSize =
          "14px";

        arButton.style.fontFamily =
          "Arial, sans-serif";

        container.appendChild(
          arButton
        );

        // ----------------------------------------------
        // XR SESSION START
        // ----------------------------------------------

        renderer.xr.addEventListener(
          "sessionstart",
          async () => {
            console.log(
              "XR session started"
            );

            xrSession =
              renderer?.xr.getSession() ??
              null;

            if (!xrSession) {
              console.error(
                "XR session not available"
              );
              return;
            }

            try {
              // ----------------------------------------
              // Viewer reference space
              // ----------------------------------------

              viewerSpace =
                await xrSession.requestReferenceSpace(
                  "viewer"
                );

              console.log(
                "Viewer reference space created"
              );

              // ----------------------------------------
              // Hit test source
              // ----------------------------------------

              hitTestSource =
                await xrSession.requestHitTestSource(
                  {
                    space: viewerSpace,
                  }
                );

              if (hitTestSource) {
                console.log(
                  "Hit test source created"
                );

                setMessage(
                  "Move your phone slowly over the floor."
                );
              }
            } catch (error) {
              console.error(
                "Hit test initialization failed:",
                error
              );

              setError(
                "Unable to start surface detection."
              );
            }
          }
        );

        // ----------------------------------------------
        // XR SESSION END
        // ----------------------------------------------

        const handleSessionEnd =
          () => {
            console.log(
              "XR session ended"
            );

            hitTestSource?.cancel();

            hitTestSource = null;

            viewerSpace = null;

            xrSession = null;

            if (elevator) {
              elevator.visible =
                false;
            }

            setIsPlaced(false);

            setMessage(
              "Move your phone slowly to detect the floor."
            );
          };

        renderer.xr.addEventListener(
          "sessionend",
          handleSessionEnd
        );

        // ----------------------------------------------
        // TAP TO PLACE
        // ----------------------------------------------

        const handleTap = () => {
          if (!renderer?.xr.isPresenting) {
            return;
          }

          if (!reticle) {
            return;
          }

          if (!reticle.visible) {
            console.log(
              "No surface detected yet"
            );
            return;
          }

          if (!elevator) {
            console.log(
              "Elevator model not loaded yet"
            );
            return;
          }

          // ------------------------------------------
          // Extract position from reticle matrix
          // ------------------------------------------

          const position =
            new THREE.Vector3();

          const quaternion =
            new THREE.Quaternion();

          const scale =
            new THREE.Vector3();

          reticle.matrix.decompose(
            position,
            quaternion,
            scale
          );

          // ------------------------------------------
          // Place elevator
          // ------------------------------------------

          elevator.position.copy(
            position
          );

          // Keep elevator upright
          elevator.rotation.set(
            0,
            0,
            0
          );

          elevator.visible = true;

          setIsPlaced(true);

          setMessage(
            "Elevator placed. Move your phone to view it."
          );

          console.log(
            "Elevator placed at:",
            position
          );
        };

        renderer.domElement.addEventListener(
          "click",
          handleTap
        );

        // ----------------------------------------------
        // Animation Loop
        // ----------------------------------------------

        renderer.setAnimationLoop(
          (
            _time: number,
            frame?: XRFrame
          ) => {
            if (
              !renderer ||
              !scene ||
              !camera
            ) {
              return;
            }

            // ------------------------------------------
            // XR Hit Test
            // ------------------------------------------

            if (
              frame &&
              hitTestSource &&
              renderer.xr.isPresenting
            ) {
              const referenceSpace =
                renderer.xr.getReferenceSpace();

              if (referenceSpace) {
                const results =
                  frame.getHitTestResults(
                    hitTestSource
                  );

                if (
                  results.length > 0
                ) {
                  const hit =
                    results[0];

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

                    console.log(
                      "Surface detected"
                    );
                  }
                } else {
                  if (reticle) {
                    reticle.visible =
                      false;
                  }
                }
              }
            }

            // ------------------------------------------
            // Render
            // ------------------------------------------

            renderer.render(
              scene,
              camera
            );
          }
        );

        // ----------------------------------------------
        // Resize
        // ----------------------------------------------

        const handleResize =
          () => {
            if (
              !renderer ||
              !camera
            ) {
              return;
            }

            const width =
              window.innerWidth;

            const height =
              window.innerHeight;

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
          handleResize
        );

        // ----------------------------------------------
        // Cleanup
        // ----------------------------------------------

        return () => {
          cancelled = true;

          window.removeEventListener(
            "resize",
            handleResize
          );

          renderer?.domElement.removeEventListener(
            "click",
            handleTap
          );

          renderer?.removeEventListener?.(
            "sessionend",
            handleSessionEnd
          );

          hitTestSource?.cancel();

          renderer?.setAnimationLoop(
            null
          );

          if (
            xrSession &&
            renderer?.xr.isPresenting
          ) {
            xrSession.end().catch(
              () => {}
            );
          }

          // Dispose model
          if (elevator) {
            elevator.traverse(
              (object) => {
                const mesh =
                  object as THREE.Mesh;

                if (
                  mesh.geometry
                ) {
                  mesh.geometry.dispose();
                }

                if (
                  mesh.material
                ) {
                  const materials =
                    Array.isArray(
                      mesh.material
                    )
                      ? mesh.material
                      : [mesh.material];

                  materials.forEach(
                    (material) => {
                      material.dispose();

                      if (
                        material.map
                      ) {
                        material.map.dispose();
                      }
                    }
                  );
                }
              }
            );
          }

          // Dispose reticle
          if (reticle) {
            reticle.geometry.dispose();

            if (
              Array.isArray(
                reticle.material
              )
            ) {
              reticle.material.forEach(
                (material) =>
                  material.dispose()
              );
            } else {
              reticle.material.dispose();
            }
          }

          // Dispose renderer
          renderer?.dispose();

          // Remove DOM
          if (
            renderer?.domElement.parentElement ===
            container
          ) {
            container.removeChild(
              renderer.domElement
            );
          }

          if (
            arButton?.parentElement ===
            container
          ) {
            container.removeChild(
              arButton
            );
          }
        };
      } catch (error) {
        console.error(
          "AR initialization error:",
          error
        );

        setIsSupported(false);

        setError(
          "Unable to initialize AR."
        );
      }
    };

    let cleanup:
      | (() => void)
      | undefined;

    initialize().then(
      (result) => {
        cleanup = result;
      }
    );

    return () => {
      cancelled = true;

      if (cleanup) {
        cleanup();
      }
    };
  }, [modelUrl]);

  // --------------------------------------------------
  // Exit AR
  // --------------------------------------------------

  const handleExit = async () => {
    try {
      // The XR session is owned by Three.js.
      // The ARButton handles its own session.
      onExit?.();
    } catch {
      onExit?.();
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

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
        touchAction: "none",
      }}
    >
      {/* ----------------------------------------- */}
      {/* Top instruction */}
      {/* ----------------------------------------- */}

      {isSupported &&
        !isPlaced && (
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              right: 20,
              zIndex: 1100,
              padding:
                "16px 18px",
              borderRadius: 16,
              background:
                "rgba(0,0,0,0.78)",
              color: "#fff",
              textAlign: "center",
              fontSize: 14,
              lineHeight: 1.5,
              pointerEvents: "none",
              backdropFilter:
                "blur(8px)",
            }}
          >
            Move your phone slowly
            over the floor until the
            white circle appears.
            <br />
            Then tap the circle to
            place the elevator.
          </div>
        )}

      {/* ----------------------------------------- */}
      {/* Placed message */}
      {/* ----------------------------------------- */}

      {isPlaced && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            right: 20,
            zIndex: 1100,
            padding:
              "12px 18px",
            borderRadius: 14,
            background:
              "rgba(0,0,0,0.78)",
            color: "#fff",
            textAlign: "center",
            fontSize: 14,
            pointerEvents: "none",
          }}
        >
          Elevator placed successfully
        </div>
      )}

      {/* ----------------------------------------- */}
      {/* Error */}
      {/* ----------------------------------------- */}

      {error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform:
              "translate(-50%, -50%)",
            width: "calc(100% - 40px)",
            maxWidth: 380,
            zIndex: 2000,
            padding: 24,
            borderRadius: 16,
            background:
              "rgba(0,0,0,0.92)",
            color: "#fff",
            textAlign: "center",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {/* ----------------------------------------- */}
      {/* Exit button */}
      {/* ----------------------------------------- */}

      <button
        type="button"
        onClick={handleExit}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 1500,
          padding:
            "10px 16px",
          borderRadius: 10,
          border:
            "1px solid rgba(255,255,255,0.5)",
          background:
            "rgba(0,0,0,0.7)",
          color: "#fff",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        EXIT
      </button>

      {/* ----------------------------------------- */}
      {/* Status */}
      {/* ----------------------------------------- */}

      {!error && (
        <div
          style={{
            position: "absolute",
            bottom: 90,
            left: "50%",
            transform:
              "translateX(-50%)",
            zIndex: 1050,
            width: "calc(100% - 40px)",
            maxWidth: 360,
            padding:
              "10px 14px",
            borderRadius: 12,
            background:
              "rgba(0,0,0,0.65)",
            color: "#fff",
            textAlign: "center",
            fontSize: 12,
            pointerEvents: "none",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}