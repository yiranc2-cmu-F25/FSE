import { reverseConvertBloodType } from "./bloodTypeConverter.js";
import { arrayToString } from "./dataParser.js";
import { isVisibilityOkOrHelp } from "./visibilityUtils.js";

const FIELD_MAPPINGS = {
  // Basic fields
  height: { type: "number", name: "height" },
  weight: { type: "number", name: "weight" },
  allergies: { type: "array", name: "allergies" },
  currentMedications: { type: "array", name: "medications" },
  chronicConditions: { type: "array", name: "chronicConditions" },
  emergencyContacts: { type: "array", name: "emergencyContacts" },
  
  // Visibility checkboxes
  visibility: {
    facePhoto: { name: "showAvatar", fallback: ["facePhoto", "facePhotoId"] },
    bloodType: { name: "showBloodType", fallback: ["bloodType", "bloddType"] },
    height: { name: "showHeight" },
    weight: { name: "showWeight" },
    allergies: { name: "showAllergies" },
    currentMedications: { name: "showMedications" },
    chronicConditions: { name: "showChronicConditions" },
    emergencyContacts: { name: "showEmergencyContacts" },
  },
};

export function setFormFieldValue(form, fieldName, value) {
  const field = form.querySelector(`[name="${fieldName}"]`);
  if (!field) {
    console.warn(`Field not found: ${fieldName}`);
    return;
  }

  // Temporarily enable if disabled to set value
  const wasDisabled = field.disabled;
  if (wasDisabled) {
    field.disabled = false;
  }

  field.value = value;

  // Restore disabled state
  if (wasDisabled) {
    field.disabled = true;
  }

  // Dispatch change event for select elements
  if (field.tagName === "SELECT") {
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function setCheckbox(form, checkboxName, checked) {
  const checkbox = form.querySelector(`input[name="${checkboxName}"]`);
  if (checkbox) {
    checkbox.checked = checked;
  }
}

export function populateFormFields(form, profileData) {
  if (!profileData) {
    return;
  }

  // Handle blood type (special case with conversion)
  if (profileData.bloodType !== null && profileData.bloodType !== undefined) {
    const convertedValue = reverseConvertBloodType(profileData.bloodType);
    setFormFieldValue(form, "bloodType", convertedValue);
  }

  // Handle basic fields
  Object.entries(FIELD_MAPPINGS).forEach(([key, config]) => {
    if (key === "visibility") return; // Handle visibility separately

    const value = profileData[key];
    if (value === null || value === undefined) return;

    if (config.type === "array" && Array.isArray(value)) {
      setFormFieldValue(form, config.name, arrayToString(value));
    } else if (config.type === "number" && typeof value === "number") {
      setFormFieldValue(form, config.name, value);
    }
  });

  // Handle visibility checkboxes
  if (profileData.visibility) {
    const visibility = profileData.visibility;
    Object.entries(FIELD_MAPPINGS.visibility).forEach(([key, config]) => {
      let visibilityValue = visibility[key];
      
      // Handle fallback values (e.g., bloddType typo)
      if (!visibilityValue && config.fallback) {
        for (const fallbackKey of config.fallback) {
          if (visibility[fallbackKey]) {
            visibilityValue = visibility[fallbackKey];
            break;
          }
        }
      }

      if (visibilityValue) {
        setCheckbox(form, config.name, isVisibilityOkOrHelp(visibilityValue));
      } else {
        // Default to emergencyOnly (unchecked)
        setCheckbox(form, config.name, false);
      }
    });
  }
}

export function collectFormData(form, convertBloodType, parseArrayField, parseNumberField, getVisibilitySetting, parseEmergencyContacts, parseHeight, parseWeight) {
  const formData = new FormData(form);

  // Get basic fields
  const basicFields = {
    bloodType: convertBloodType(formData.get("bloodType")),
    height: parseHeight ? parseHeight(formData.get("height")) : parseNumberField(formData.get("height")),
    weight: parseWeight ? parseWeight(formData.get("weight")) : parseNumberField(formData.get("weight")),
    allergies: parseArrayField(formData.get("allergies")),
    currentMedications: parseArrayField(formData.get("medications")),
    chronicConditions: parseArrayField(formData.get("chronicConditions")),
    emergencyContacts: parseEmergencyContacts ? parseEmergencyContacts(formData.get("emergencyContacts")) : parseArrayField(formData.get("emergencyContacts")),
  };

  // Get visibility checkboxes
  const visibility = {
    facePhoto: getVisibilitySetting(formData.get("showAvatar") === "on"),
    bloodType: getVisibilitySetting(formData.get("showBloodType") === "on"),
    height: getVisibilitySetting(formData.get("showHeight") === "on"),
    weight: getVisibilitySetting(formData.get("showWeight") === "on"),
    allergies: getVisibilitySetting(formData.get("showAllergies") === "on"),
    currentMedications: getVisibilitySetting(formData.get("showMedications") === "on"),
    chronicConditions: getVisibilitySetting(formData.get("showChronicConditions") === "on"),
    emergencyContacts: getVisibilitySetting(formData.get("showEmergencyContacts") === "on"),
  };

  return {
    ...basicFields,
    visibility,
  };
}

