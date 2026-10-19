import { assetUrl } from "../assets.js";
import { createPhysicsRuntime, POLICY_FILES, TASK_FILES, TEMPLATE_FILES } from "./runtime.js";
export async function loadBrowserRuntime(onProgress, { policyKeys = null } = {}) {
  onProgress(0.02, "loadingWake");
  const ortUrl=assetUrl('assets/runtime/ort.wasm.min.mjs');
  const ortPromise=import(/* @vite-ignore */ ortUrl);
  // Resolve both engine imports together so failed imports cannot go unhandled.

  const responses=new Map();
  const get = (path) => {
    if(!responses.has(path))responses.set(path,fetch(assetUrl(`assets/${path}`)).then(response=>{
      if(!response.ok)throw new Error(`Resource load failed (${response.status}): ${path}`);
      return response.arrayBuffer();
    }));
    return responses.get(path);
  };
  const initialPaths=[...TEMPLATE_FILES,...Object.values(POLICY_FILES),...Object.values(TASK_FILES)];
  // Attach rejection handlers immediately; the runtime and downloads overlap.
  const prefetch=Promise.all(initialPaths.map(get)).then(()=>null,error=>error);
  const moduleUrl = assetUrl('assets/runtime/mujoco.js');
  const [{default:loadMujoco},ort]=await Promise.all([import(/* @vite-ignore */ moduleUrl),ortPromise]);
  ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=assetUrl('assets/runtime/');
  const mj = await loadMujoco({locateFile:file=>assetUrl(`assets/runtime/${file}`)});
  // createPhysicsRuntime consumes the same cached promises, including failures.
  void prefetch;
  onProgress(0.2, 'loadingTrack');
  return createPhysicsRuntime({
    mj,
    ort,
    onProgress,
    policyKeys,
    readText: async (path) => new TextDecoder().decode(await get(path)),
    readBinary:get,
    createPolicy: async (path,bytes) =>
      ort.InferenceSession.create(bytes, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
        enableCpuMemArena: true,
      }),
  });
}
