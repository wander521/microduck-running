// Nominal XL330 voltage/current controller for newly exported mjlab task scenes.
// Copyright 2025 Marc Duclusaud & Grégoire Passault. Apache-2.0.
// BAM / Rhoban, Apache-2.0. Keep the two PWM clamps in firmware order.
import { BAM } from "./bam-config.js";

const ERROR_GAIN = 4096 / (2 * Math.PI) / (256 * 885);
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

export function skillServoTorque(target, position, velocity, {
  volts = 7.35, kp = 200, maxCurrent = 1.75, maxPwm = 1,
} = {}) {
  const requested = (target - position) * kp * ERROR_GAIN;
  const center = BAM.kt * velocity / volts;
  const span = BAM.R * maxCurrent / volts;
  const duty = clamp(clamp(requested, center - span, center + span), -maxPwm, maxPwm);
  // At extreme backdrive speed the battery PWM limit can prevent the current
  // limiter from holding its target. Do not apply an unphysical torque clamp.
  return BAM.kt * volts * duty / BAM.R - BAM.kt ** 2 * velocity / BAM.R;
}

export function skillFrictionBudget(motor, external, velocity) {
  const stribeck = Math.exp(-Math.pow(Math.abs(velocity / BAM.dtheta_stribeck), BAM.alpha));
  // Match bam.mjlab.BamActuator._compute_friction_budget, including its
  // unconditional quadratic term and >= branch. The native bam.Model helper
  // instead gates this term on opposing torque signs; it is not equivalent.
  const quadratic = Math.abs(motor) > Math.abs(external)
    ? BAM.load_friction_external_quad * external ** 2
    : BAM.load_friction_motor_quad * motor ** 2;
  return BAM.friction_base + Math.abs(external * BAM.load_friction_external - motor * BAM.load_friction_motor)
    + stribeck * (BAM.friction_stribeck
      + Math.abs(external * BAM.load_friction_external_stribeck - motor * BAM.load_friction_motor_stribeck)
      + quadratic);
}

export function updateSkillServos(world, options) {
  const { model, data, mj, slot } = world;
  // efc_id identifies a DOF for mjCNSTR_FRICTION_DOF, not a joint.
  // A floating root alone makes those two index spaces differ by five.
  const frictionForDof = new Float64Array(model.nv);
  const type = mj.mjtConstraint.mjCNSTR_FRICTION_DOF.value;
  for (let i = 0; i < data.nefc; i++)
    if (data.efc_type[i] === type) frictionForDof[data.efc_id[i]] += data.efc_force[i];
  for (let j = 0; j < slot.jointIds.length; j++) {
    const dof = slot.dof[j];
    const velocity = data.qvel[dof];
    const external = -data.qfrc_bias[dof] + data.qfrc_constraint[dof] - frictionForDof[dof];
    model.dof_frictionloss[dof] = skillFrictionBudget(data.qfrc_actuator[dof], external, velocity);
    model.dof_damping[dof] = BAM.friction_viscous;
    // Firmware closes on the output encoder; back-EMF/friction stay motor-side.
    const encoderPosition = data.qpos[slot.qpos[j]]
      + (slot.backlashQpos ? data.qpos[slot.backlashQpos[j]] : 0);
    data.ctrl[slot.ctrl[j]] = skillServoTorque(slot.motorTargets[j], encoderPosition, velocity, options);
  }
}
