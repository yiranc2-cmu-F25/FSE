// utils/coachingBoard/validationHelpers.js
// Helper functions for validation logic

import CategorySkillPresetDac from "../../dacs/categorySkillPresetDac.js";
import User from "../../entities/User.js";

/**
 * Validate title
 */
export function validateTitle(title) {
  return typeof title === "string" && title.trim().length > 0 && title.trim().length < 50;
}

/**
 * Validate required publish fields
 */
export async function validateRequiredPublishFields(body) {
  const { title, category, description, objective, steps, relatedSkills } = body ?? {};
  
  if (!validateTitle(title)) {
    return { ok: false, message: "Title must be non-empty and < 50 characters." };
  }
  
  const presets = await CategorySkillPresetDac.getPresets();
  const categories = presets.categories || [];
  const skills = presets.skills || [];
  
  if (!categories.includes(category)) {
    return { ok: false, message: "Category must be chosen from system preset." };
  }
  
  if (typeof description !== "string" || !description.trim()) {
    return { ok: false, message: "Description is required." };
  }
  
  if (typeof objective !== "string" || !objective.trim()) {
    return { ok: false, message: "Objective is required." };
  }
  
  if (!Array.isArray(steps) || steps.length === 0) {
    return { ok: false, message: "At least one step is required." };
  }
  
  if (!Array.isArray(relatedSkills) || relatedSkills.length === 0) {
    return { ok: false, message: "At least one related skill is required." };
  }
  
  if (!relatedSkills.every(s => skills.includes(s))) {
    return { ok: false, message: "Related Skills must be from system preset." };
  }
  
  return { ok: true };
}

/**
 * Validate board data (for updates)
 */
export async function validateBoardData(data) {
  if (!validateTitle(data.title)) {
    return { ok: false, message: "Title must be non-empty and < 50 characters." };
  }
  
  const presets = await CategorySkillPresetDac.getPresets();
  const categories = presets.categories || [];
  const skills = presets.skills || [];
  
  if (!categories.includes(data.category)) {
    return { ok: false, message: "Category must be chosen from system preset." };
  }
  
  if (typeof data.description !== "string" || !data.description.trim()) {
    return { ok: false, message: "Description is required." };
  }
  
  if (typeof data.objective !== "string" || !data.objective.trim()) {
    return { ok: false, message: "Objective is required." };
  }
  
  if (!Array.isArray(data.steps) || data.steps.length === 0) {
    return { ok: false, message: "At least one step is required." };
  }
  
  if (!Array.isArray(data.relatedSkills) || data.relatedSkills.length === 0) {
    return { ok: false, message: "At least one related skill is required." };
  }
  
  if (!data.relatedSkills.every(s => skills.includes(s))) {
    return { ok: false, message: "Related Skills must be from system preset." };
  }
  
  return { ok: true };
}

/**
 * Verify user has at least one of the related skills
 */
export async function verifyAtLeastOneUserSkill(requesterId, relatedSkills) {
  if (!requesterId) return false;
  
  try {
    const userSkills = await User.getSkillsById(requesterId);
    return relatedSkills.some(s => userSkills.includes(s));
  } catch (err) {
    return false;
  }
}

