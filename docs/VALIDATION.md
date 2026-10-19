# Validation / 验证说明

The checks cover a fixed local scene; they are not randomized robustness or hardware qualification. Browser floating-point/inference differences may change the race outcome.

这些检查覆盖固定本地场景，不代表随机条件稳定性或实机验收；不同浏览器的数值和推理差异可能改变比赛结果。

## Reproducible checks / 可复现检查

- `npm test`: continuous course, nonintersecting edges, ordered gates, fitted coastline, start slots, M recovery, absent sea-surface floor, the first-finisher ten-second rule, matching bilingual message contracts, unchanged batched world vertices, and exact static/dynamic presentation transforms.
- `npm run check:performance`: native read-only presentation extraction and worker pose-buffer comparison; see [performance notes](PERFORMANCE.md).
- `npm run build`: production assets and local WebAssembly preparation.
- `npm run check:race`: full race with no ordinary-walk fallback, physical champion dance, and reset.
- `npm run check:roll`: learned forward roll on the shipped finite ground.
- `npm run check:coast`: outward shoreline push and offshore fall.
- `npm run check:hurdles`: first-contact hurdle release, no subsequent duck contact, manual M release, and reset.

Diagnostics write reports into `evidence/`; generated output, development screenshots, build caches, and remote training files are excluded from version control.

诊断结果写入 `evidence/`；生成记录、开发截图、构建缓存和远程训练文件不纳入版本控制。

## Recorded baseline / 已记录基线

Before the bilingual packaging pass, the native race's first duck finished at 93.04 seconds and the round ended at 103.04 seconds. The browser run showed 01:23.5 → 01:33.5. Both retained unfinished racers and entered the podium. The native champion danced for 20 seconds without falling. A roll rotated 6.233 radians and landed. A 3-second, 1.5 N shoreline push was contained; an explicitly offshore actor fell to about −1.139 m, with no walkable sea surface. Hurdle release and reset checks passed.

双语整理前的原生物理记录：首鸭在 93.04 秒冲线、103.04 秒结束；浏览器记录为 01:23.5 → 01:33.5。未完赛者正确保留并进入领奖台。冠军舞蹈运行 20 秒无跌倒；前滚翻约 6.233 rad 并落地。海岸边界承受 3 秒、1.5 N 向外推力；主动放到海上的鸭子下落至约 −1.139 米，不存在海面行走地板。路障解除和重置检查通过。

These are observed runs, not guaranteed lap times. The running model is checkpoint 13194; unevaluated later training experiments are not bundled.

以上为实际观测，不是保证圈速。捆绑的极速跑策略为 13194，未加入尚未验收的后续训练模型。
