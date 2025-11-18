import { convertBloodType } from "../utils/emergencyProfile/bloodTypeConverter.js";
import { parseArrayField, parseNumberField, parseEmergencyContacts, parseHeight, parseWeight } from "../utils/emergencyProfile/dataParser.js";
import { getVisibilitySetting } from "../utils/emergencyProfile/visibilityUtils.js";
import { loadProfileData, saveProfile, deleteProfile, uploadPhoto } from "../utils/emergencyProfile/emergencyProfileApi.js";
import { populateFormFields, collectFormData } from "../utils/emergencyProfile/formUtils.js";

document.addEventListener("DOMContentLoaded", () => {
  const changeBtn = document.getElementById("change-btn");
  const discardBtn = document.getElementById("discard-btn");
  const uploadPhotoBtn = document.getElementById("upload-photo-btn");
  const profileAvatar = document.getElementById("profile-avatar");
  const photoUploadSuccess = document.getElementById("photo-upload-success");
  const photoUploadError = document.getElementById("photo-upload-error");
  const form = document.querySelector("form");
  const successModal = document.getElementById("success-modal");
  const successModalTitle = document.getElementById("success-modal-title");
  const successModalDescription = document.getElementById("success-modal-description");
  const successModalClose = document.getElementById("success-modal-close");
  const confirmDeleteModal = document.getElementById("confirm-delete-modal");
  const confirmDeleteCancel = document.getElementById("confirm-delete-cancel");
  const confirmDeleteOk = document.getElementById("confirm-delete-ok");
  
  // Helper function to show success modal
  function showSuccessModal(title, description) {
    if (successModal && successModalTitle && successModalDescription) {
      successModalTitle.textContent = title;
      successModalDescription.textContent = description;
      successModal.classList.remove("hidden");
      document.body.classList.add("overflow-hidden");
      successModalClose?.focus();
    }
  }
  
  // Helper function to close success modal
  function closeSuccessModal() {
    if (successModal) {
      successModal.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
    }
  }
  
  // Helper function to show confirm delete modal
  function showConfirmDeleteModal() {
    return new Promise((resolve) => {
      if (confirmDeleteModal) {
        confirmDeleteModal.classList.remove("hidden");
        document.body.classList.add("overflow-hidden");
        
        // Setup one-time event listeners
        const handleConfirm = () => {
          closeConfirmDeleteModal();
          resolve(true);
        };
        
        const handleCancel = () => {
          closeConfirmDeleteModal();
          resolve(false);
        };
        
        if (confirmDeleteOk) {
          confirmDeleteOk.addEventListener("click", handleConfirm, { once: true });
        }
        if (confirmDeleteCancel) {
          confirmDeleteCancel.addEventListener("click", handleCancel, { once: true });
        }
        
        // Close on overlay click
        const handleOverlayClick = (e) => {
          if (e.target === confirmDeleteModal) {
            closeConfirmDeleteModal();
            resolve(false);
          }
        };
        confirmDeleteModal.addEventListener("click", handleOverlayClick, { once: true });
        
        // Close on Escape key
        const handleEscape = (e) => {
          if (e.key === "Escape") {
            closeConfirmDeleteModal();
            resolve(false);
          }
        };
        document.addEventListener("keydown", handleEscape, { once: true });
      } else {
        resolve(false);
      }
    });
  }
  
  // Helper function to close confirm delete modal
  function closeConfirmDeleteModal() {
    if (confirmDeleteModal) {
      confirmDeleteModal.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
    }
  }
  
  // Setup modal close handlers
  if (successModalClose) {
    successModalClose.addEventListener("click", closeSuccessModal);
  }
  if (successModal) {
    // Close modal when clicking on the overlay (background)
    successModal.addEventListener("click", (e) => {
      if (e.target === successModal) {
        closeSuccessModal();
      }
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && successModal && !successModal.classList.contains("hidden")) {
      closeSuccessModal();
    }
  });
  
  // Helper function to show error message
  function showPhotoError(message) {
    if (photoUploadError) {
      photoUploadError.textContent = message;
      photoUploadError.classList.remove("hidden");
      // Hide success message if it's showing
      if (photoUploadSuccess) {
        photoUploadSuccess.classList.add("hidden");
      }
      // Hide error message after 5 seconds
      setTimeout(() => {
        if (photoUploadError) {
          photoUploadError.classList.add("hidden");
        }
      }, 5000);
    }
  }
  
  // Helper function to show success message
  function showPhotoSuccess() {
    if (photoUploadSuccess) {
      photoUploadSuccess.classList.remove("hidden");
      // Hide error message if it's showing
      if (photoUploadError) {
        photoUploadError.classList.add("hidden");
      }
      // Hide success message after 3 seconds
      setTimeout(() => {
        if (photoUploadSuccess) {
          photoUploadSuccess.classList.add("hidden");
        }
      }, 3000);
    }
  }
  
  // Get all form inputs and checkboxes
  const inputs = form.querySelectorAll("input[type='text'], select");
  const checkboxes = form.querySelectorAll("input[type='checkbox']");
  
  let isEditMode = false;
  let originalProfileData = null; // Store original data for reset
  
  function toggleEditMode() {
    isEditMode = !isEditMode;
    
    // Toggle disabled state for all inputs
    inputs.forEach((input) => {
      input.disabled = !isEditMode;
    });
    
    // Toggle disabled state for all checkboxes
    checkboxes.forEach((checkbox) => {
      checkbox.disabled = !isEditMode;
    });
    
    // Toggle upload button visibility and button texts
    if (isEditMode) {
      uploadPhotoBtn.classList.remove("hidden");
      changeBtn.textContent = "Save";
      discardBtn.textContent = "Discard";
    } else {
      uploadPhotoBtn.classList.add("hidden");
      changeBtn.textContent = "Change";
      discardBtn.textContent = "Delete";
    }
  }
  

  // Function to populate form with profile data
  function populateForm(profileData) {
    if (!profileData) {
      console.log("No profile data to populate");
      return;
    }

    console.log("Populating form with data:", profileData);
    originalProfileData = profileData; // Store for reset

    // Populate form fields using utility function
    populateFormFields(form, profileData);

    // Display profile photo if available
    if (profileData.facePhoto && profileData.facePhoto.data) {
      profileAvatar.innerHTML = `<img src="${profileData.facePhoto.data}" alt="Profile" class="h-24 w-24 rounded-full object-cover" />`;
    }
  }

  // Load profile data automatically on page load
  async function initProfileData() {
    const profileData = await loadProfileData();
    if (profileData) {
      populateForm(profileData);
    }
  }

  // Initialize profile data on page load
  initProfileData();

  // Add real-time validation for emergency contacts input
  const emergencyContactsInput = form.querySelector('input[name="emergencyContacts"]');
  const emergencyContactsError = document.getElementById('emergency-contacts-error');
  
  if (emergencyContactsInput) {
    emergencyContactsInput.addEventListener('input', (e) => {
      const value = e.target.value;
      if (!value || value.trim() === "") {
        // Clear any error styling and hide error message if field is empty
        e.target.classList.remove('border-red-500');
        if (emergencyContactsError) {
          emergencyContactsError.classList.add('hidden');
        }
        return;
      }
      
      // Check if all comma-separated values are numbers
      const contacts = value.split(",").map((item) => item.trim()).filter((item) => item !== "");
      const invalidContacts = contacts.filter((contact) => contact !== "" && !/^\d+$/.test(contact));
      
      if (invalidContacts.length > 0) {
        // Add error styling and show error message
        e.target.classList.add('border-red-500');
        if (emergencyContactsError) {
          emergencyContactsError.classList.remove('hidden');
        }
      } else {
        // Remove error styling and hide error message
        e.target.classList.remove('border-red-500');
        if (emergencyContactsError) {
          emergencyContactsError.classList.add('hidden');
        }
      }
    });
  }

  // Add real-time validation for height input
  const heightInput = form.querySelector('input[name="height"]');
  const heightError = document.getElementById('height-error');
  
  if (heightInput) {
    heightInput.addEventListener('input', (e) => {
      const value = e.target.value;
      if (!value || value.trim() === "") {
        // Clear any error styling and hide error message if field is empty
        e.target.classList.remove('border-red-500');
        if (heightError) {
          heightError.classList.add('hidden');
        }
        return;
      }
      
      const num = parseFloat(value);
      if (isNaN(num) || num < 50 || num > 300) {
        // Add error styling and show error message
        e.target.classList.add('border-red-500');
        if (heightError) {
          heightError.classList.remove('hidden');
        }
      } else {
        // Remove error styling and hide error message
        e.target.classList.remove('border-red-500');
        if (heightError) {
          heightError.classList.add('hidden');
        }
      }
    });
  }

  // Add real-time validation for weight input
  const weightInput = form.querySelector('input[name="weight"]');
  const weightError = document.getElementById('weight-error');
  
  if (weightInput) {
    weightInput.addEventListener('input', (e) => {
      const value = e.target.value;
      if (!value || value.trim() === "") {
        // Clear any error styling and hide error message if field is empty
        e.target.classList.remove('border-red-500');
        if (weightError) {
          weightError.classList.add('hidden');
        }
        return;
      }
      
      const num = parseFloat(value);
      if (isNaN(num) || num < 10 || num > 500) {
        // Add error styling and show error message
        e.target.classList.add('border-red-500');
        if (weightError) {
          weightError.classList.remove('hidden');
        }
      } else {
        // Remove error styling and hide error message
        e.target.classList.remove('border-red-500');
        if (weightError) {
          weightError.classList.add('hidden');
        }
      }
    });
  }

  // Attach click handler to profile avatar (reload data)
  profileAvatar.addEventListener("click", async () => {
    const profileData = await loadProfileData();
    if (profileData) {
      populateForm(profileData);
    }
  });

  // Attach click handler to Change button
  changeBtn.addEventListener("click", async () => {
    if (!isEditMode) {
      // Enter edit mode
      toggleEditMode();
    } else {
      // Save changes
      try {
        changeBtn.disabled = true;
        changeBtn.textContent = "Saving...";

        // Collect form data and build request body
        const requestBody = collectFormData(
          form,
          convertBloodType,
          parseArrayField,
          parseNumberField,
          getVisibilitySetting,
          parseEmergencyContacts,
          parseHeight,
          parseWeight
        );

        // Call API
        const data = await saveProfile(requestBody);

        // Update original profile data with the saved data
        originalProfileData = data;

        // Exit edit mode
        toggleEditMode();
        
        // Show success modal
        showSuccessModal(
          "Emergency Profile Saved!",
          "Your emergency profile has been updated successfully."
        );
      } catch (err) {
        console.error("Failed to save profile:", err);
        // Show specific error message if it's a validation error
        const errorMessage = err.message || "Failed to update emergency profile. Please try again later.";
        alert(errorMessage);
        changeBtn.disabled = false;
        changeBtn.textContent = "Save";
      }
    }
  });
  
  // Attach click handler to Discard/Delete button
  discardBtn.addEventListener("click", async () => {
    if (isEditMode) {
      // Discard changes and exit edit mode
      toggleEditMode();
      // Reset form to original values
      if (originalProfileData) {
        populateForm(originalProfileData);
      } else {
        // If no original data, reload from server
        const profileData = await loadProfileData();
        if (profileData) {
          populateForm(profileData);
        }
      }
      console.log("Discarding changes...");
    } else {
      // Delete action - show confirm modal first
      const confirmed = await showConfirmDeleteModal();
      if (!confirmed) {
        return;
      }
      
      try {
        discardBtn.disabled = true;
        discardBtn.textContent = "Deleting...";
        
        await deleteProfile();
        
        // Show success modal before redirecting
        showSuccessModal(
          "Emergency Profile Deleted!",
          "Your emergency profile has been deleted successfully."
        );
        
        // Redirect after a short delay to show the modal
        setTimeout(() => {
          window.location.href = "/emergency-profile";
        }, 1500);
      } catch (err) {
        console.error("Failed to delete profile:", err);
        alert("Failed to delete emergency profile. Please try again later.");
        discardBtn.disabled = false;
        discardBtn.textContent = "Delete";
      }
    }
  });
  
  // Handle upload photo button click
  uploadPhotoBtn.addEventListener("click", () => {
    // Create a file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) {
        return;
      }
      
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showPhotoError("File size must be less than 10MB");
        return;
      }
      
      try {
        uploadPhotoBtn.disabled = true;
        uploadPhotoBtn.textContent = "Uploading...";
        
        // Get visibility setting for photo (from showAvatar checkbox)
        const showAvatarCheckbox = form.querySelector('input[name="showAvatar"]');
        const photoVisibility = showAvatarCheckbox && showAvatarCheckbox.checked ? "helpOrOk" : "emergencyOnly";
        
        // Upload to server
        await uploadPhoto(file, photoVisibility);
        
        // Preview the uploaded image immediately (don't reload entire form)
        // This preserves user's current form inputs
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageDataUrl = event.target.result;
          profileAvatar.innerHTML = `<img src="${imageDataUrl}" alt="Profile" class="h-24 w-24 rounded-full object-cover" />`;
          
          // Update originalProfileData with new photo info (without reloading entire form)
          if (originalProfileData) {
            originalProfileData.facePhoto = {
              data: imageDataUrl
            };
          }
        };
        reader.readAsDataURL(file);
        
        // Show green success message below avatar
        showPhotoSuccess();
      } catch (err) {
        console.error("Failed to upload photo:", err);
        const errorMessage = err.message || "Failed to upload photo. Please try again later.";
        showPhotoError(errorMessage);
      } finally {
        uploadPhotoBtn.disabled = false;
        uploadPhotoBtn.textContent = "Upload";
      }
    });
    
    fileInput.click();
  });
});

