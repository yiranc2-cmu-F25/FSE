// Import blood type constants to avoid duplication
// Note: This is a frontend utility, so we define the mapping here
// The backend constants are in constants/bloodType.js
const BLOOD_TYPE_TO_CONSTANT = {
  "A+": "A_POS",
  "A-": "A_NEG",
  "B+": "B_POS",
  "B-": "B_NEG",
  "AB+": "AB_POS",
  "AB-": "AB_NEG",
  "O+": "O_POS",
  "O-": "O_NEG",
};

const CONSTANT_TO_BLOOD_TYPE = {
  "A_POS": "A+",
  "A_NEG": "A-",
  "B_POS": "B+",
  "B_NEG": "B-",
  "AB_POS": "AB+",
  "AB_NEG": "AB-",
  "O_POS": "O+",
  "O_NEG": "O-",
  "UNKNOWN": "unknown",
};

export function convertBloodType(bloodType) {
  if (!bloodType || bloodType === "unknown" || bloodType === "" || bloodType === "Unknown") {
    return null;
  }
  return BLOOD_TYPE_TO_CONSTANT[bloodType] || null;
}

export function reverseConvertBloodType(bloodType) {
  if (!bloodType) {
    return "";
  }
  
  // If backend returns direct format like "A-", return as is
  if (BLOOD_TYPE_TO_CONSTANT[bloodType]) {
    return bloodType;
  }
  
  // Convert from constant format (A_POS, A_NEG, etc.)
  return CONSTANT_TO_BLOOD_TYPE[bloodType] || "";
}

