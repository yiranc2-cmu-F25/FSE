/**
 * Edit Profile Validation
 * Reuses the same validation logic from joinCommunity.js
 * - Username: min 3 chars, checks against API for reserved/exists status
 * - Password: min 4 chars (only validated if "Change Password" is checked)
 * - Debounced validation on input
 */

const API = {
  usernameStatus: "/api/authentications/users/usernames",
};

// Setup password field toggle
function setupPasswordToggle() {
  const checkbox = document.getElementById("change-password-checkbox");
  const passwordInput = document.getElementById("input-password");
  
  if (!checkbox || !passwordInput) return;
  
  checkbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      // Enable password field and clear it
      passwordInput.disabled = false;
      passwordInput.classList.remove("bg-gray-50");
      passwordInput.value = "";
      passwordInput.placeholder = "Enter new password";
      passwordInput.focus();
    } else {
      // Disable password field and clear it
      passwordInput.disabled = true;
      passwordInput.classList.add("bg-gray-50");
      passwordInput.value = "";
      passwordInput.placeholder = "Leave unchecked to keep current password";
      // Clear any password errors
      const errorEl = document.getElementById("input-password-error");
      if (errorEl) {
        errorEl.classList.add("hidden");
        errorEl.textContent = "";
      }
      // Reset password validation state
      if (validationState.password) {
        validationState.password.isValid = true;
        validationState.password.error = "";
      }
    }
  });
}

// Initialize password toggle on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupPasswordToggle);
} else {
  setupPasswordToggle();
}

// --- Utility Functions ---
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  const data = await res.json();
  return { res, data };
}

async function requestUsernameStatus(username) {
  return postJSON(API.usernameStatus, { username });
}

// --- Validation Logic (matching joinCommunity.js rules) ---
function validateUsernameLength(username) {
  if (username.length < 3) {
    return "Username must be at least 3 characters.";
  }
  return null;
}

function validatePasswordLength(password) {
  if (password.length > 0 && password.length < 4) {
    return "Password must be at least 4 characters.";
  }
  return null;
}

async function validateUsernameAsync(username) {
  // Client-side length check first
  const lengthError = validateUsernameLength(username);
  if (lengthError) return lengthError;

  // Empty username is valid (user hasn't typed yet)
  if (!username.trim()) return null;

  try {
    const { res, data } = await requestUsernameStatus(username.trim());
    
    if (!res.ok) {
      return data?.message || "Unable to validate username.";
    }
    
    if (data.status === "reserved") {
      return data.message || "This username is not allowed.";
    }
    
    // Note: For edit profile, "exists" status might be OK if it's the current user's username
    // But we'll still show it as a warning/info. The backend should handle this case.
    // For now, we'll allow "exists" status since user might be editing their own profile
    
    return null; // Valid
  } catch (err) {
    console.error("Username validation error:", err);
    return "Network error. Please check your connection.";
  }
}

// --- Validation State Tracking ---
const validationState = {
  username: { isValid: true, error: null },
  password: { isValid: true, error: null },
};

// Flag to prevent infinite loop when submitting valid form
let isSubmitting = false;

// --- Wiggle Animation Helper ---
function triggerWiggle(inputId) {
  // Map input IDs to section IDs
  const inputToSectionMap = {
    "input-username": "username-section",
    "input-password": "password-section",
  };
  
  const sectionId = inputToSectionMap[inputId] || inputId;
  const section = document.getElementById(sectionId);
  if (!section) return;
  
  // Remove existing wiggle class if present
  section.classList.remove("wiggle");
  
  // Force reflow to restart animation
  void section.offsetWidth;
  
  // Add wiggle class
  section.classList.add("wiggle");
  
  // Remove after animation completes
  setTimeout(() => {
    section.classList.remove("wiggle");
  }, 400);
}

// --- DOM Helpers ---
function showError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorDiv = document.getElementById(inputId + "-error");
  
  if (!input || !errorDiv) return;

  if (message) {
    // Show error
    input.classList.add("border-red-500", "text-red-600");
    input.classList.remove("border-gray-300");
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
    
    // Update validation state
    if (inputId === "input-username") {
      validationState.username = { isValid: false, error: message };
    } else if (inputId === "input-password") {
      validationState.password = { isValid: false, error: message };
    }
  } else {
    // Clear error
    input.classList.remove("border-red-500", "text-red-600");
    input.classList.add("border-gray-300");
    errorDiv.textContent = "";
    errorDiv.classList.add("hidden");
    
    // Update validation state
    if (inputId === "input-username") {
      validationState.username = { isValid: true, error: null };
    } else if (inputId === "input-password") {
      validationState.password = { isValid: true, error: null };
    }
  }
}

function validatePassword(value) {
  // Only validate password if "Change Password" checkbox is checked
  const checkbox = document.getElementById("change-password-checkbox");
  const isPasswordChangeEnabled = checkbox && checkbox.checked;
  
  if (!isPasswordChangeEnabled) {
    // Password change is disabled, clear any errors
    showError("input-password", null);
    return;
  }
  
  // Validate password length only if checkbox is checked
  const error = validatePasswordLength(value);
  showError("input-password", error);
}

// --- Debounced Validation Handlers ---
const validateUsernameDebounced = debounce(async (e) => {
  const value = e.target.value.trim();
  const error = await validateUsernameAsync(value);
  showError("input-username", error);
}, 500);

const validatePasswordDebounced = debounce((e) => {
  validatePassword(e.target.value);
}, 500);

// --- Synchronous Validation for Form Submit ---
async function validateAllFields() {
  const usernameInput = document.getElementById("input-username");
  const passwordInput = document.getElementById("input-password");
  
  let isValid = true;
  const failedInputFields = [];

  // Validate username
  if (usernameInput) {
    const usernameValue = usernameInput.value.trim();
    const usernameError = await validateUsernameAsync(usernameValue);
    showError("input-username", usernameError);
    
    if (usernameError) {
      isValid = false;
      failedInputFields.push("input-username");
    }
  }

  // Validate password (only if "Change Password" checkbox is checked)
  const checkbox = document.getElementById("change-password-checkbox");
  const isPasswordChangeEnabled = checkbox && checkbox.checked;
  
  if (isPasswordChangeEnabled && passwordInput) {
    const passwordValue = passwordInput.value;
    const passwordError = validatePasswordLength(passwordValue);
    showError("input-password", passwordError);
    
    if (passwordError) {
      isValid = false;
      failedInputFields.push("input-password");
    }
  } else if (passwordInput) {
    // Password change is disabled, clear any errors
    showError("input-password", null);
  }

  // Trigger wiggle animation on failed sections
  if (!isValid) {
    failedInputFields.forEach((inputId) => {
      triggerWiggle(inputId);
    });
  }

  return isValid;
}

// --- Form Submit Handler ---
async function handleFormSubmit(e) {
  // If we're already submitting (after validation passed), allow it
  if (isSubmitting) {
    return true;
  }
  
  // Always prevent default first, then validate
  e.preventDefault();
  
  const isValid = await validateAllFields();
  
  if (!isValid) {
    // Focus on first invalid field
    const usernameInput = document.getElementById("input-username");
    const passwordInput = document.getElementById("input-password");
    
    if (!validationState.username.isValid && usernameInput) {
      usernameInput.focus();
    } else if (!validationState.password.isValid && passwordInput) {
      passwordInput.focus();
    }
    
    return false; // Prevent form submission
  }
  
  // All validations passed, show confirm modal instead of submitting directly
  if (window.showConfirmModal) {
    window.showConfirmModal();
  } else {
    console.error("Modal workflow not loaded");
  }
}

// --- Initialize ---
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("edit-profile-form");
  const usernameInput = document.getElementById("input-username");
  const passwordInput = document.getElementById("input-password");

  // Attach form submit handler
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }

  if (usernameInput) {
    usernameInput.addEventListener("input", validateUsernameDebounced);
    // Clear error on focus
    usernameInput.addEventListener("focus", () => {
      if (usernameInput.value.trim()) {
        validateUsernameDebounced({ target: usernameInput });
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", (e) => {
      // Only validate if password field is enabled
      if (!passwordInput.disabled) {
        validatePasswordDebounced(e);
      }
    });
    // Clear error on focus (only if enabled)
    passwordInput.addEventListener("focus", () => {
      if (!passwordInput.disabled && passwordInput.value) {
        validatePasswordDebounced({ target: passwordInput });
      }
    });
  }
});
