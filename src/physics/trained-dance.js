import {
  CONTROL_DT,
  OBS_SIZE,
  projectedGravity,
} from "./constants.js";
import { danceCommand } from "./dance-command.js";
import { updateSkillServos } from "./skill-servos.js";

// Training randomizes bus latency over 3–6 physics steps. The browser uses a
// nominal 4-step (20ms) transport delay, without smoothing policy actions.
export const DANCE_ACTUATOR_LAG = 4;

// Assembly is a one-second transition. After assembly, joint motion, body
// motion and foot contacts come from ONNX inference and MuJoCo dynamics.
export function beginPolicyDance(world) {
  if (!world.runtime.policies.dance || !world.runtime.templates.dance)
    throw new Error("Trained dance assets are not loaded");
  world.danceSaved = {
    qpos: new Float64Array(world.data.qpos),
    qvel: new Float64Array(world.data.qvel),
    time: world.data.time,
    elapsed: world.elapsed,
    states: world.saveStates(),
    actors: new Map(
      [...world.room.players.values()].map((p) => [
        p.id,
        { mode: p.mode, spectator: p.spectator },
      ]),
    ),
    ball: world.readBall(),
    goal: world.room.goal,
  };
  for (const p of world.room.players.values()) {
    p.mode = "walk";
    p.danceActor = true;
    p.spectator = false;
    p.forward = 0;
    p.turn = 0;
    p.kickRequested = false;
  }
  world.rebuild();
  // A dance world uses its training solver and motor contract. Disable MuJoCo's
  // emergency reset so a numerical failure cannot silently become a new dance.
  world.model.opt.disableflags |= world.runtime.mj.mjtDisableBit.mjDSBL_AUTORESET.value;
  world.danceTime = 0;
  world.danceBeat = 0;
  world.danceFalls = 0;
  world.danceFinished = false;
  const { mj } = world.runtime;
  const ballGeom = mj.mj_name2id(world.model, mj.mjtObj.mjOBJ_GEOM.value, "ball_geom");
  world.model.geom_contype[ballGeom] = 0;
  world.model.geom_conaffinity[ballGeom] = 0;
  for (const slot of world.slots.values()) {
    const pose = world.runtime.danceInfo.runtime.defaultPose;
    slot.lastAction.fill(0);
    slot.targets.set(pose);
    slot.danceVelocity = new Float32Array(14);
    slot.danceFallen = false;
    slot.danceTargetHistory = Array.from(
      { length: DANCE_ACTUATOR_LAG + 1 },
      () => new Float64Array(pose),
    );
    slot.danceTargetIndex = 0;
    slot.danceTargetHistoryReady = false;
  }
}

function holdBall(world) {
  world.setBall({ ...world.danceSaved.ball, vx: 0, vz: 0, vy: 0, angular: [0, 0, 0] });
}

export function danceObservation(world, slot, command) {
  const { data, runtime } = world;
  const q = data.qpos, v = data.qvel;
  const pose = runtime.danceInfo.runtime.defaultPose;
  const obs = new Float32Array(OBS_SIZE);
  obs.set(v.slice(slot.baseV + 3, slot.baseV + 6));
  const gravity = projectedGravity(Array.from(q.slice(slot.baseQ + 3, slot.baseQ + 7)));
  obs.set(gravity, 3);
  for (let j = 0; j < 14; j++) {
    obs[6 + j] = q[slot.qpos[j]] - pose[j];
    obs[20 + j] = slot.danceVelocity[j];
    slot.danceVelocity[j] = v[slot.dof[j]];
  }
  obs.set(slot.lastAction, 34);
  if (command.twist) obs.set(command.twist, 48);
  if (command.head) obs.set(command.head, 51);
  obs.set(command.body, 55);
  return obs;
}

async function inferDance(world, player, slot, command) {
  const { data, runtime } = world;
  const q = data.qpos;
  const pose = runtime.danceInfo.runtime.defaultPose;
  const obs = danceObservation(world, slot, command);
  const gravity = obs.subarray(3, 6);
  const fallen = gravity[2] > -0.6 || q[slot.baseQ + 2] < 0.025;
  if (fallen && !slot.danceFallen) world.danceFalls++;
  slot.danceFallen = fallen;
  const session = runtime.policies.dance;
  const out = await session.run({
    [session.inputNames[0]]: new runtime.ort.Tensor("float32", obs, [1, OBS_SIZE]),
  });
  const action = out[session.outputNames[0]].data;
  if (action.length !== 14 || !action.every(Number.isFinite))
    throw new Error("Invalid trained dance output");
  slot.lastAction.set(action);
  slot.targets.set(action.map((value, j) => pose[j] + value));
  player.recovery = null;
  player.kick = 0;
}

export async function stepPolicyDance(world) {
  const start = performance.now();
  if (world.room.performanceRestartRequested) {
    endPolicyDance(world);
    world.room.performanceRestartRequested = false;
  }
  if (!world.danceSaved) beginPolicyDance(world);
  if (world.danceFinished) return;
  world.danceTime += CONTROL_DT;
  const actors = [...world.room.players.values()];
  const pose = world.runtime.danceInfo.runtime.defaultPose;
  const settings = world.room.performance || { bpm: 128, move: null };
  const concert = false;
  const bpm = settings.bpm;
  if (world.danceTime > 2) world.danceBeat += CONTROL_DT * bpm / 60;

  const programme = null;
  const command = danceCommand(world.danceBeat * 60 / bpm, bpm, programme ? programme.move : settings.move ?? undefined);
  if (world.danceTime <= 1) {
    const t = world.danceTime, ease = t * t * (3 - 2 * t);
    world.data.qvel.fill(0);
    actors.forEach((player, i) => {
      const slot = world.slots.get(player.id);
      const saved = world.danceSaved.states.get(player.id);
      const target = [(i - (actors.length - 1) / 2) * 0.48, 0.12, 0.125, Math.SQRT1_2, 0, 0, -Math.SQRT1_2];
      const b = slot.baseQ;
      for (let j = 0; j < 3; j++)
        world.data.qpos[b + j] = saved.position[j] + (target[j] - saved.position[j]) * ease;
      const dot = target.slice(3).reduce((sum, value, j) => sum + value * saved.position[j + 3], 0);
      const quat = target.slice(3).map((value, j) =>
        saved.position[j + 3] * (1 - ease) + value * ease * (dot < 0 ? -1 : 1),
      );
      const length = Math.hypot(...quat);
      world.data.qpos.set(quat.map((value) => value / length), b + 3);
      slot.qpos.forEach((address, j) => {
        world.data.qpos[address] = saved.joints[j] + (pose[j] - saved.joints[j]) * ease;
      });
      slot.lastAction.fill(0);
      slot.targets.set(pose);
    });
    holdBall(world);
    world.runtime.mj.mj_forward(world.model, world.data);
  } else {
    // The beat stays at zero for the settling second; the same learned dance
    // controller handles entry, rather than swapping in an unrelated walk actor.
    await Promise.all(actors.map((p, i) => inferDance(world, p, world.slots.get(p.id),
      programme ? { ...command, head: programme.heads[i] } : command)));
    // Exit commands can arrive while asynchronous ONNX execution is in flight.
    if (!world.room.dancing) {
      endPolicyDance(world);
      return;
    }
    for (let i = 0; i < 4; i++) {
      holdBall(world);
      for (const slot of world.slots.values()) {
        if (!slot.danceTargetHistoryReady) {
          slot.danceTargetHistory.forEach((target) => target.set(slot.targets));
          slot.danceTargetHistoryReady = true;
        }
        slot.danceTargetHistory[slot.danceTargetIndex].set(slot.targets);
        slot.danceTargetIndex = (slot.danceTargetIndex + 1) % slot.danceTargetHistory.length;
        slot.motorTargets = slot.danceTargetHistory[slot.danceTargetIndex];
        updateSkillServos({ model: world.model, data: world.data, mj: world.runtime.mj, slot });
      }
      world.runtime.mj.mj_step(world.model, world.data);
    }
    if (![...world.data.qpos, ...world.data.qvel, ...world.data.qacc].every(Number.isFinite))
      throw new Error("舞蹈物理状态异常，请重置后重试");
    for (let i = 0; i < world.runtime.mj.mjtWarning.mjNWARNING.value; i++)
      if (world.data.warning.get(i).number) throw new Error(`舞蹈物理警告 ${i}，请重置后重试`);
    holdBall(world);
    world.frame++;
    world.elapsed += CONTROL_DT;
  }
  world.room.dance = {
    time: world.danceTime,
    bpm: command.bpm,
    beat: command.beat,
    move: world.danceTime < 1 ? "全体集合！" : world.danceTime < 2 ? "站稳，准备开跳" : programme?.sectionName || command.moveName,
    engine: "onnx",
    policy: world.runtime.danceInfo?.id,
    stage: world.danceTime < 1 ? "formation" : world.danceTime < 2 ? "settle" : programme?.completed ? 'complete' : "dance",
    ...(programme ? { programme: { title: programme.title, section: programme.section,
      musicBpm: programme.musicBpm, remainingBeats: programme.remainingBeats, completed: programme.completed } } : {}),
    falls: world.danceFalls,
  };
  if (programme?.completed) world.danceFinished = true;
  world.syncState();
  world.lastStepMs = performance.now() - start;
}

export function endPolicyDance(world) {
  const saved = world.danceSaved;
  if (!saved) return;
  for (const player of world.room.players.values()) {
    const previous = saved.actors.get(player.id);
    if (previous) {
      player.mode = previous.mode;
      // Space explicitly returns a spectator to the pitch; preserve that command.
      if (player.resetRevision === saved.states.get(player.id)?.resetRevision)
        player.spectator = previous.spectator;
    }
    delete player.danceActor;
  }
  world.rebuild();
  world.data.qpos.set(saved.qpos);
  world.data.qvel.set(saved.qvel);
  world.data.time = saved.time;
  world.elapsed = saved.elapsed;
  for (const [id, slot] of world.slots) {
    const state = saved.states.get(id);
    if (state) {
      slot.lastAction.set(state.lastAction);
      slot.resetRevision = state.resetRevision;
    }
  }
  world.room.balls[0] = saved.ball;
  world.room.goal = saved.goal;
  world.danceSaved = null;
  world.room.dance = null;
  world.runtime.mj.mj_forward(world.model, world.data);
}
