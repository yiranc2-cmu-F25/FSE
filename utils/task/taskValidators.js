/**
 * Validation utilities for task data
 */

/**
 * Validates a string field
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @throws {Error} If validation fails
 */
function validateStringField(value, fieldName) {
  if (!value || typeof value !== "string") {
    throw new Error(`Invalid ${fieldName}: must be a string`);
  }
}

/**
 * Validates title field with length constraint
 * @param {*} value - Value to validate
 * @throws {Error} If validation fails
 */
function validateTitle(value) {
  validateStringField(value, "title");
  if (value.length > 50) {
    throw new Error("Invalid title: must be a string with max 50 characters");
  }
}

/**
 * Validates helpers field (must be number >= 1)
 * @param {*} value - Value to validate
 * @throws {Error} If validation fails
 */
function validateHelpers(value) {
  if (typeof value !== "number" || value < 1) {
    throw new Error("Invalid helpers: must be a number >= 1");
  }
}

/**
 * Validates task update data fields
 * @param {Object} updateData - Data to validate
 * @throws {Error} If validation fails
 */
export function validateTaskUpdateData(updateData) {
  const validators = {
    title: validateTitle,
    helpers: validateHelpers,
    description: (v) => validateStringField(v, "description"),
    category: (v) => validateStringField(v, "category"),
    emergencyLevel: (v) => validateStringField(v, "emergencyLevel"),
    taskType: (v) => validateStringField(v, "taskType"),
  };

  Object.keys(validators).forEach((field) => {
    if (updateData[field] !== undefined) {
      validators[field](updateData[field]);
    }
  });
}

