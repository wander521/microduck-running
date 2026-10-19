# Performance / 性能优化

## What changed / 本次调整

- Startup and race restart now use the player-follow camera. The overview remains available in the dock; **C** restores following.
- Robot visuals load alongside the physics worker. XML, task files, policy downloads and required collision meshes load concurrently; ONNX session compilation remains serial to bound peak memory.
- Untextured static scenery and coastal rails share batched geometry. Alternating curb colours use contiguous geometry instead of 1,024 tiny material groups. Physics collision geometry is unchanged.
- Fixed rail poses are sent once. Worker frames contain moving/visible-changing props, rather than every fixed shore segment. Robot collision meshes are no longer copied into a presentation that immediately discards them.
- Duck poses and the follow camera interpolate between worker samples on animation frames. This affects display only; simulation remains at a **20 ms control interval / 5 ms physics timestep**, using the same learned policies.
- HUD text updates at most ten times per second, skips unchanged values and only reorders the standings when the order changes. Paused/ready scenes render on changes; shadow maps refresh when the scene changes.
- The official pinned ONNX browser module is served locally. This removes an unused duplicate WASM binary from the static build; it does **not** remove the required physics or inference engines.

进入游戏和重开均默认跟随玩家小鸭，底栏仍可切换俯瞰，**C** 可恢复跟随。外观与物理引擎并行加载，模型等独立资源并发下载，策略会话依次编译以控制内存峰值。静态海岛、护栏与路肩合并绘制；固定护栏姿态只发送一次，不再复制随后丢弃的机器人碰撞网格。

小鸭与镜头采用显示插值，HUD 每秒最多更新十次，内容不变时跳过写入，排名变化时才重排。待发车和暂停后按需绘制。物理仍使用 **20 ms 控制间隔 / 5 ms 仿真步长**，沿用原策略及碰撞模型。ONNX 使用本地官方模块，避免构建产物重复收录 WASM。

## Measurements / 测量结果

Local desktop in-app browser, 1280 × 720, same render resolution and 2048² shadow map. These are observations on this machine, not device-independent FPS promises.

本机桌面内置浏览器，1280 × 720，相同渲染分辨率与 2048² 阴影贴图。数据仅代表本机观测，不是所有设备的帧率保证。

| Check / 检查 | Before / 优化前 | After / 优化后 |
| --- | ---: | ---: |
| Follow camera at start, draw calls / 起跑跟随视角绘制请求 | 1,585 | 284 |
| Prop pose buffer per worker frame / 每帧道具姿态数据 | 26,688 B | 1,056 B |
| Native presentation extraction median, 12 samples / 原生场景展示数据提取中位耗时，12 次采样 | 6.289 ms | 2.210 ms |
| Static build directory, allocated size / 静态发布目录占用 | ~50.2 MiB | ~36.7 MiB |

The follow-camera draw count fell by about **82%**, and prop transform payload by **96%**. Native extraction and browser rendering are different measurements. Batching can submit more offscreen scenery triangles in exchange for substantially fewer draw calls.

跟随视角绘制请求约减少 **82%**，道具变换数据约减少 **96%**。原生数据提取耗时与浏览器渲染是两种测量。合并绘制可能提交更多视野外的静态三角形，换取大幅减少的绘制请求。

Startup wall time varied with browser cache and concurrent local test processes; no first-load speedup percentage is claimed. MuJoCo and ONNX WASM initialization, model compilation and the five policies remain part of the initial load. The smaller build directory includes a removed binary that was previously emitted but not needed as a second runtime download.

首屏等待受缓存和本机同时运行的测试影响，本次不声称首屏提速百分比。首次仍需加载、初始化 MuJoCo 与 ONNX WASM，并编译模型及五个策略。发布目录缩小包含删除原先重复输出的引擎文件，不等同于首屏网络下载量减少相同大小。

## Reproduce / 复测

```sh
npm test
npm run check:performance
npm run dev
```

Open `http://127.0.0.1:5175/?perf=1`. The optional probe writes local diagnostics to `#world` data attributes (`data-ready-ms`, `data-load-stages`, `data-draw-calls`, `data-render-count`, `data-performance`). It sends no telemetry. `data-performance` contains the last 300 rendered frames; evaluate it during a running race, since intentionally idle rendering is not a running FPS sample. Compare the same camera, viewport, browser visibility, cache state and race section. Native comparison output is saved under the ignored `evidence/` directory.

使用 `?perf=1` 可在 `#world` 的上述 data 属性中查看本地诊断，不会上报。`data-performance` 统计最近 300 个实际渲染帧，应在比赛运行时读取；按需绘制的暂停画面不能作为实跑帧率。对比时保持视角、窗口、页面可见性、缓存与赛段一致。原生数据对比写入被忽略的 `evidence/` 目录。
