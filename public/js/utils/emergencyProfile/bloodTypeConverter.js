export function convertBloodType(bloodType) {
  if (!bloodType || bloodType === "unknown" || bloodType === "" || bloodType === "Unknown") {
    return null;
  }
  const mapping = {
    "A+": "A_POS",
    "A-": "A_NEG",
    "B+": "B_POS",
    "B-": "B_NEG",
    "AB+": "AB_POS",
    "AB-": "AB_NEG",
    "O+": "O_POS",
    "O-": "O_NEG",
  };
  return mapping[bloodType] || null;
}

export function reverseConvertBloodType(bloodType) {
  if (!bloodType) {
    return "";
  }
  
  // If backend returns direct format like "A-", return as is
  if (bloodType === "A+" || bloodType === "A-" || 
      bloodType === "B+" || bloodType === "B-" ||
      bloodType === "AB+" || bloodType === "AB-" ||
      bloodType === "O+" || bloodType === "O-") {
    return bloodType;
  }
  
  // Convert from constant format (A_POS, A_NEG, etc.)
  const mapping = {
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
  
  return mapping[bloodType] || "";
}

