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

  const [isSupported, setIsSupported] =
    useState<boolean | null>(null);

  const [isPlaced, setIsPlaced] =
    useState(false);

  const [message, setMessage] = useState(
    "Move your phone slowly over the floor."
  );

  const [error, setError] = useState("");

  // Keep latest placed state available inside animation loop
  const isPlacedRef = useRef(false);

  useEffect(() => {
    isPlacedRef.current = isPlaced;
  }, [isPlaced]);

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

    let arButton: HTMLElement | null = null;

    let xrSession: XRSession | null = null;

    let hitTestSource: XRHitTestSource | null = null;
    let hitTestSourceRequested = false;

    let cancelled = false;

    // --------------------------------------------------
    // SELECT / TAP
    // --------------------------------------------------

    const handleSelect = () => {
      if (!renderer) {
        return;
      }

      if (!renderer.xr.isPresenting) {
        return;
      }

      // No surface detected
      if (!reticle || !reticle.visible) {
        setMessage(
          "Move your phone until the white circle appears."
        );

        return;
      }

      // Elevator not loaded
      if (!elevator) {
        setMessage(
          "Elevator model is still loading."
        );

        return;
      }

      // ----------------------------------------------
      // Get reticle position
      // ----------------------------------------------

      const position = new THREE.Vector3();

      const quaternion =
        new THREE.Quaternion();

      const scale = new THREE.Vector3();

      reticle.matrix.decompose(
        position,
        quaternion,
        scale
      );

      // ----------------------------------------------
      // Place elevator
      // ----------------------------------------------

      elevator.position.copy(position);

      // Keep elevator upright
      elevator.rotation.set(
        0,
        0,
        0
      );

      elevator.visible = true;

      isPlacedRef.current = true;

      setIsPlaced(true);

      setMessage(
        "Elevator placed successfully."
      );

      console.log(
        "Elevator placed at:",
        position
      );
    };

    // --------------------------------------------------
    // INITIALIZE
    // --------------------------------------------------

    const initialize = async (): Promise<
      (() => void) | undefined
    > => {
      try {
        // ----------------------------------------------
        // WEBXR CHECK
        // ----------------------------------------------

        const xr = navigator.xr;

        if (!xr) {
          setIsSupported(false);

          setError(
            "WebXR is not available in this browser."
          );

          return;
        }

        const supported =
          await xr.isSessionSupported(
            "immersive-ar"
          );

        if (cancelled) {
          return;
        }

        setIsSupported(supported);

        if (!supported) {
          setError(
            "Immersive AR is not supported on this device."
          );

          return;
        }

        // ----------------------------------------------
        // SCENE
        // ----------------------------------------------

        scene = new THREE.Scene();

        // ----------------------------------------------
        // CAMERA
        // ----------------------------------------------

        camera =
          new THREE.PerspectiveCamera(
            70,
            window.innerWidth /
              window.innerHeight,
            0.01,
            100
          );

        // ----------------------------------------------
        // RENDERER
        // ----------------------------------------------

        renderer =
          new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference:
              "high-performance",
          });

        renderer.setPixelRatio(
          Math.min(
            window.devicePixelRatio,
            2
          )
        );

        renderer.setSize(
          window.innerWidth,
          window.innerHeight
        );

        renderer.setClearColor(
          0x000000,
          0
        );

        renderer.xr.enabled = true;

        /*
         * IMPORTANT
         *
         * Do NOT use:
         *
         * renderer.xr.setReferenceSpaceType(
         *   "local-floor"
         * );
         */

        container.appendChild(
          renderer.domElement
        );

        // ----------------------------------------------
        // LIGHTS
        // ----------------------------------------------

        const hemisphereLight =
          new THREE.HemisphereLight(
            0xffffff,
            0x444444,
            2
          );

        scene.add(
          hemisphereLight
        );

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

        scene.add(
          directionalLight
        );

        // ----------------------------------------------
        // RETICLE
        // ----------------------------------------------

        const reticleGeometry =
          new THREE.RingGeometry(
            0.08,
            0.1,
            32
          );

        reticleGeometry.rotateX(
          -Math.PI / 2
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
        // LOAD ELEVATOR GLB
        // ----------------------------------------------

        const loader =
          new GLTFLoader();

        loader.load(
          modelUrl,

          (gltf) => {
            if (
              cancelled ||
              !scene
            ) {
              return;
            }

            elevator = gltf.scene;

            // ------------------------------------------
            // ORIGINAL SIZE
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
            // TARGET HEIGHT
            // ------------------------------------------

            const targetHeight = 2.5;

            if (
              originalSize.y > 0
            ) {
              const scale =
                targetHeight /
                originalSize.y;

              elevator.scale.setScalar(
                scale
              );
            }

            // ------------------------------------------
            // CENTER MODEL
            // ------------------------------------------

            const scaledBox =
              new THREE.Box3().setFromObject(
                elevator
              );

            const center =
              new THREE.Vector3();

            scaledBox.getCenter(
              center
            );

            elevator.position.x -=
              center.x;

            elevator.position.z -=
              center.z;

            // ------------------------------------------
            // BOTTOM TO FLOOR
            // ------------------------------------------

            const finalBox =
              new THREE.Box3().setFromObject(
                elevator
              );

            elevator.position.y -=
              finalBox.min.y;

            // Initially hidden
            elevator.visible = false;

            scene.add(elevator);

            console.log(
              "Elevator model loaded."
            );
          },

          undefined,

          (loadError) => {
            console.error(
              "GLB loading error:",
              loadError
            );

            setError(
              "Unable to load Elevator_Master.glb"
            );
          }
        );

        // ----------------------------------------------
        // AR BUTTON
        // ----------------------------------------------

        arButton =
          ARButton.createButton(
            renderer,
            {
              requiredFeatures: [
                "hit-test",
              ],

              optionalFeatures: [
                "dom-overlay",
              ],

              domOverlay: {
                root: container,
              },
            }
          );

        // Button style

        arButton.style.position =
          "absolute";

        arButton.style.bottom =
          "24px";

        arButton.style.left =
          "50%";

        arButton.style.transform =
          "translateX(-50%)";

        arButton.style.zIndex =
          "3000";

        arButton.style.padding =
          "14px 28px";

        arButton.style.border =
          "1px solid rgba(255,255,255,0.7)";

        arButton.style.borderRadius =
          "10px";

        arButton.style.background =
          "rgba(0,0,0,0.75)";

        arButton.style.color =
          "#ffffff";

        arButton.style.fontSize =
          "15px";

        arButton.style.fontFamily =
          "Arial, sans-serif";

        container.appendChild(
          arButton
        );

        // ----------------------------------------------
        // SESSION START
        // ----------------------------------------------

        const handleSessionStart =
          () => {
            console.log(
              "XR session started."
            );

            xrSession =
              renderer?.xr.getSession() ??
              null;

            hitTestSource = null;

            hitTestSourceRequested =
              false;

            isPlacedRef.current =
              false;

            setIsPlaced(false);

            setMessage(
              "Move your phone slowly over the floor."
            );

            // ------------------------------------------
            // IMPORTANT
            // SELECT EVENT IS ON XRSession
            // ------------------------------------------

            if (xrSession) {
              xrSession.addEventListener(
                "select",
                handleSelect
              );
            }
          };

        renderer.xr.addEventListener(
          "sessionstart",
          handleSessionStart
        );

        // ----------------------------------------------
        // SESSION END
        // ----------------------------------------------

        const handleSessionEnd =
          () => {
            console.log(
              "XR session ended."
            );

            // Remove select listener
            if (xrSession) {
              xrSession.removeEventListener(
                "select",
                handleSelect
              );
            }

            // Cancel hit test
            if (
              hitTestSource
            ) {
              hitTestSource.cancel();
            }

            hitTestSource = null;

            hitTestSourceRequested =
              false;

            xrSession = null;

            // Hide reticle
            if (reticle) {
              reticle.visible =
                false;
            }

            // Hide elevator
            if (elevator) {
              elevator.visible =
                false;
            }

            isPlacedRef.current =
              false;

            setIsPlaced(false);

            setMessage(
              "Move your phone slowly over the floor."
            );
          };

        renderer.xr.addEventListener(
          "sessionend",
          handleSessionEnd
        );

        // ----------------------------------------------
        // ANIMATION LOOP
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
            // XR FRAME
            // ------------------------------------------

            if (
              frame &&
              renderer.xr.isPresenting
            ) {
              const referenceSpace =
                renderer.xr.getReferenceSpace();

              const session =
                renderer.xr.getSession();

              // ----------------------------------------
              // REQUEST HIT TEST SOURCE
              // ----------------------------------------

              if (
                !hitTestSourceRequested &&
                session
              ) {
                hitTestSourceRequested =
                  true;

                void (async () => {
                  try {
                    const viewerSpace =
                      await session.requestReferenceSpace(
                        "viewer"
                      );

                    // Type-safe check
                    if (
                      typeof session.requestHitTestSource !==
                      "function"
                    ) {
                      console.error(
                        "requestHitTestSource is not supported."
                      );

                      setError(
                        "Hit-test is not supported by this AR session."
                      );

                      hitTestSourceRequested =
                        false;

                      return;
                    }

                    const source =
                      await session.requestHitTestSource(
                        {
                          space:
                            viewerSpace,
                        }
                      );

                    if (
                      cancelled
                    ) {
                      source?.cancel();

                      return;
                    }

                    hitTestSource =
                      source ?? null;

                    console.log(
                      "Hit test source created."
                    );
                  } catch (
                    hitTestError
                  ) {
                    console.error(
                      "Hit test source error:",
                      hitTestError
                    );

                    hitTestSourceRequested =
                      false;

                    setError(
                      "Unable to start surface detection."
                    );
                  }
                })();
              }

              // ----------------------------------------
              // HIT TEST
              // ----------------------------------------

              if (
                hitTestSource &&
                referenceSpace
              ) {
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

                    if (
                      !isPlacedRef.current
                    ) {
                      setMessage(
                        "Surface detected. Tap to place the elevator."
                      );
                    }
                  }
                } else {
                  if (reticle) {
                    reticle.visible =
                      false;
                  }

                  if (
                    !isPlacedRef.current
                  ) {
                    setMessage(
                      "Move your phone slowly over the floor."
                    );
                  }
                }
              }
            }

            // ------------------------------------------
            // RENDER
            // ------------------------------------------

            renderer.render(
              scene,
              camera
            );
          }
        );

        // ----------------------------------------------
        // RESIZE
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
        // CLEANUP
        // ----------------------------------------------

        return () => {
          cancelled = true;

          window.removeEventListener(
            "resize",
            handleResize
          );

          renderer?.xr.removeEventListener(
            "sessionstart",
            handleSessionStart
          );

          renderer?.xr.removeEventListener(
            "sessionend",
            handleSessionEnd
          );

          if (xrSession) {
            xrSession.removeEventListener(
              "select",
              handleSelect
            );
          }

          if (
            hitTestSource
          ) {
            hitTestSource.cancel();

            hitTestSource =
              null;
          }

          hitTestSourceRequested =
            false;

          renderer?.setAnimationLoop(
            null
          );

          if (
            xrSession &&
            renderer?.xr.isPresenting
          ) {
            void xrSession
              .end()
              .catch(() => {});
          }

          // ------------------------------------------
          // DISPOSE ELEVATOR
          // ------------------------------------------

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
                      : [
                          mesh.material,
                        ];

                  materials.forEach(
                    (material) => {
                      material.dispose();

                      const materialWithMap =
                        material as THREE.Material & {
                          map?: THREE.Texture | null;
                        };

                      if (
                        materialWithMap.map
                      ) {
                        materialWithMap.map.dispose();
                      }
                    }
                  );
                }
              }
            );
          }

          // ------------------------------------------
          // DISPOSE RETICLE
          // ------------------------------------------

          if (reticle) {
            reticle.geometry.dispose();

            const materials =
              Array.isArray(
                reticle.material
              )
                ? reticle.material
                : [
                    reticle.material,
                  ];

            materials.forEach(
              (material) => {
                material.dispose();
              }
            );

            reticle = null;
          }

          // ------------------------------------------
          // REMOVE AR BUTTON
          // ------------------------------------------

          if (
            arButton &&
            arButton.parentElement ===
              container
          ) {
            container.removeChild(
              arButton
            );
          }

          // ------------------------------------------
          // REMOVE RENDERER
          // ------------------------------------------

          if (
            renderer &&
            renderer.domElement.parentElement ===
              container
          ) {
            container.removeChild(
              renderer.domElement
            );
          }

          renderer?.dispose();

          renderer = null;
          scene = null;
          camera = null;
          elevator = null;
          arButton = null;
        };
      } catch (initError) {
        console.error(
          "AR initialization error:",
          initError
        );

        setIsSupported(false);

        setError(
          "Unable to initialize AR."
        );

        return;
      }
    };

    let cleanup:
      | (() => void)
      | undefined;

    void initialize().then(
      (cleanupFunction) => {
        cleanup =
          cleanupFunction;
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
  // EXIT
  // --------------------------------------------------

  const handleExit = () => {
    onExit?.();
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
      {/* -------------------------------------------- */}
      {/* INSTRUCTION */}
      {/* -------------------------------------------- */}

      {isSupported &&
        !isPlaced &&
        !error && (
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
                "rgba(0,0,0,0.72)",
              color: "#fff",
              textAlign: "center",
              fontSize: 14,
              lineHeight: 1.5,
              pointerEvents:
                "none",
              backdropFilter:
                "blur(8px)",
            }}
          >
            Move your phone slowly
            over the floor.
            <br />
            When the white circle
            appears, tap it.
          </div>
        )}

      {/* -------------------------------------------- */}
      {/* PLACED MESSAGE */}
      {/* -------------------------------------------- */}

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
              "rgba(0,0,0,0.72)",
            color: "#fff",
            textAlign: "center",
            fontSize: 14,
            pointerEvents:
              "none",
          }}
        >
          Elevator placed
          successfully.
        </div>
      )}

      {/* -------------------------------------------- */}
      {/* ERROR */}
      {/* -------------------------------------------- */}

      {error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform:
              "translate(-50%, -50%)",
            width:
              "calc(100% - 40px)",
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

      {/* -------------------------------------------- */}
      {/* EXIT BUTTON */}
      {/* -------------------------------------------- */}

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

      {/* -------------------------------------------- */}
      {/* STATUS */}
      {/* -------------------------------------------- */}

      {!error && (
        <div
          style={{
            position: "absolute",
            bottom: 90,
            left: "50%",
            transform:
              "translateX(-50%)",
            zIndex: 1050,
            width:
              "calc(100% - 40px)",
            maxWidth: 360,
            padding:
              "10px 14px",
            borderRadius: 12,
            background:
              "rgba(0,0,0,0.65)",
            color: "#fff",
            textAlign: "center",
            fontSize: 12,
            pointerEvents:
              "none",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}