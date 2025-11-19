/**
 * Validation utility functions for emergency profile form fields
 */

export function setupEmergencyContactsValidation(input, errorEl) {
  if (!input) return;
  
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    if (!value || value.trim() === "") {
      // Clear any error styling and hide error message if field is empty
      e.target.classList.remove('border-red-500');
      if (errorEl) {
        errorEl.classList.add('hidden');
      }
      return;
    }
    
    // Check if all comma-separated values are numbers
    const contacts = value.split(",").map((item) => item.trim()).filter((item) => item !== "");
    const invalidContacts = contacts.filter((contact) => contact !== "" && !/^\d+$/.test(contact));
    
    if (invalidContacts.length > 0) {
      // Add error styling and show error message
      e.target.classList.add('border-red-500');
      if (errorEl) {
        errorEl.classList.remove('hidden');
      }
    } else {
      // Remove error styling and hide error message
      e.target.classList.remove('border-red-500');
      if (errorEl) {
        errorEl.classList.add('hidden');
      }
    }
  });
}

export function setupHeightValidation(input, errorEl, min = 50, max = 300) {
  if (!input) return;
  
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    if (!value || value.trim() === "") {
      // Clear any error styling and hide error message if field is empty
      e.target.classList.remove('border-red-500');
      if (errorEl) {
        errorEl.classList.add('hidden');
      }
      return;
    }
    
    const num = parseFloat(value);
    if (isNaN(num) || num < min || num > max) {
      // Add error styling and show error message
      e.target.classList.add('border-red-500');
      if (errorEl) {
        errorEl.classList.remove('hidden');
      }
    } else {
      // Remove error styling and hide error message
      e.target.classList.remove('border-red-500');
      if (errorEl) {
        errorEl.classList.add('hidden');
      }
    }
  });
}

export function setupWeightValidation(input, errorEl, min = 10, max = 500) {
  if (!input) return;
  
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    if (!value || value.trim() === "") {
      // Clear any error styling and hide error message if field is empty
      e.target.classList.remove('border-red-500');
      if (errorEl) {
        errorEl.classList.add('hidden');
      }
      return;
    }
    
    const num = parseFloat(value);
    if (isNaN(num) || num < min || num > max) {
      // Add error styling and show error message
      e.target.classList.add('border-red-500');
      if (errorEl) {
        errorEl.classList.remove('hidden');
      }
    } else {
      // Remove error styling and hide error message
      e.target.classList.remove('border-red-500');
      if (errorEl) {
        errorEl.classList.add('hidden');
      }
    }
  });
}

