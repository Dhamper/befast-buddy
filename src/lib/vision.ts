/**
 * MediaPipe loaders. All processing happens in the browser — no video, audio or
 * image ever leaves the device.
 */
const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let facePromise: Promise<any> | null = null;
let posePromise: Promise<any> | null = null;

export function loadFaceLandmarker() {
  if (!facePromise) {
    facePromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
      return vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        outputFaceBlendshapes: true,
        numFaces: 1,
      });
    })().catch((e) => {
      facePromise = null;
      throw e;
    });
  }
  return facePromise;
}

export function loadPoseLandmarker() {
  if (!posePromise) {
    posePromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
      return vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    })().catch((e) => {
      posePromise = null;
      throw e;
    });
  }
  return posePromise;
}
