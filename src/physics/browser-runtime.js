import * as ort from "onnxruntime-web/wasm";
import { assetUrl } from "../assets.js";
import { createPhysicsRuntime } from "./runtime.js";
export async function loadBrowserRuntime(onProgress, { policyKeys = null } = {}) {
  onProgress(0.02, "loadingWake");
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = assetUrl("assets/runtime/");
  const moduleUrl = assetUrl("assets/runtime/mujoco.js");
  const { default: loadMujoco } = await import(/* @vite-ignore */ moduleUrl);
  const mj = await loadMujoco({
    locateFile: (file) => assetUrl(`assets/runtime/${file}`),
  });
  onProgress(0.2, "loadingTrack");
  const get = async (path) => {
    const response = await fetch(
      assetUrl(`assets/${path}`),
      path.endsWith("duckemw_dance.json") ? { cache: "no-cache" } : undefined,
    );
    if (!response.ok)
      throw new Error(`资源加载失败 (${response.status}): ${path}`);
    return response;
  };
  return createPhysicsRuntime({
    mj,
    ort,
    onProgress,
    policyKeys,
    readText: async (path) => (await get(path)).text(),
    readBinary: async (path) => (await get(path)).arrayBuffer(),
    createPolicy: async (path) =>
      ort.InferenceSession.create(await (await get(path)).arrayBuffer(), {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
        enableCpuMemArena: true,
      }),
  });
}
