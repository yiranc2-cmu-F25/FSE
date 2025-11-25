export function parseArrayField(value) {
  if (!value || value.trim() === "") {
    return [];
  }
  return value.split(",").map((item) => item.trim()).filter((item) => item !== "");
}

export function parseEmergencyContacts(value) {
  if (!value || value.trim() === "") {
    return [];
  }
  const contacts = value.split(",").map((item) => item.trim()).filter((item) => item !== "");
  
  // Validate that all contacts are numbers
  const invalidContacts = contacts.filter((contact) => !/^\d+$/.test(contact));
  if (invalidContacts.length > 0) {
    throw new Error(`Emergency contacts must be numbers only. Invalid entries: ${invalidContacts.join(", ")}`);
  }
  
  return contacts;
}

export function arrayToString(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return "";
  }
  return arr.join(", ");
}

export function parseNumberField(value) {
  if (!value || value.trim() === "") {
    return null;
  }
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

export function parseHeight(value) {
  if (!value || value.trim() === "") {
    return null;
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new Error("Height must be a valid number");
  }
  // Reasonable height range: 50-300 cm
  if (num < 50 || num > 300) {
    throw new Error("Height must be between 50 and 300 cm");
  }
  return num;
}

export function parseWeight(value) {
  if (!value || value.trim() === "") {
    return null;
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new Error("Weight must be a valid number");
  }
  // Reasonable weight range: 10-500 kg
  if (num < 10 || num > 500) {
    throw new Error("Weight must be between 10 and 500 kg");
  }
  return num;
}

