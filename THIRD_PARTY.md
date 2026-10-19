# Sources and licenses

- MicroDuck robot geometry/kinematics/GLB/STL: Pollen Robotics MicroDuck, https://github.com/pollen-robotics/microduck . Geometry remains CC BY-NC-SA 4.0; attribution and noncommercial/share-alike restrictions remain. See public/licenses/LICENSE-MODELS.md.
- Official standing policy BEST_alpha_stand.onnx and robot/control source: Pollen Robotics, https://github.com/pollen-robotics/microduck_rl and https://huggingface.co/spaces/pollen-robotics/microduck-simulator ; Apache-2.0.
- Race fast-running policy: own strong checkpoint13194, 1000-update continuation of HannesVonEssen/microduck-running checkpoint12195, source revision828d950134e29a8d04cbb51720a22c8729047fb7. Canonical export includes source normalization/action clipping; Apache-2.0. public/assets/skills/race-running/manifest.json records hashes. This is the prior authorized preview, not the unevaluated13793 map pilot.
- Forward roll6098 and stand recovery: existing own trained/continued MicroDuck policies, Apache-2.0. Bundled manifest/task descriptors retain provenance. Official standing remains the initial hold and recovery fallback.
- Champion dance: existing own DuckEMW-derived trained dance policy (61D,14actions,128BPM); source https://github.com/emwstudio/DuckEMW ; Apache-2.0. Model contract/SHA are public/assets/policies/duckemw_dance.json. Only the dance motor/phase command is reused; no music, lyrics or third-party recordings are included.
- BAM servo adaptation: copyright2025 Marc Duclusaud & Grégoire Passault, Apache-2.0, retained in source headers.
- Bungee typeface: David Jonathan Ross, SIL Open Font License1.1, public/assets/fonts/OFL-Bungee.txt.
- Three.js MIT, Vite MIT, ONNX Runtime MIT, MuJoCo Apache-2.0, @xmldom/xmldom MIT; npm dependencies retain their licenses.

Procedural island, continuous course, authored UI, noncolliding splinters and podium assembly belong to this game implementation. The two route-guided opponents are not a trained multi-agent policy. No third-party network service is required at runtime.

## Bundled geometry mapping

The upstream model notice lists upstream source paths. In this distribution it also applies to converted/derived robot geometry under `public/assets/robot/meshes/` and `microduck.glb`; XML and kinematics descriptions remain under their upstream code license. Material colours are modified for the three racers. Original geometry authorship and CC BY-NC-SA 4.0 terms remain.

本仓库中的 `public/assets/robot/meshes/` 和 `microduck.glb` 来自或转换自上游机器人几何，遵循 CC BY-NC-SA 4.0。三位选手修改了显示材质颜色；几何的原作者署名、非商业和相同方式共享条件继续适用。XML 与运动学描述沿用其上游代码许可。

See the in-game bilingual [credits page](public/THIRD_PARTY.html).
