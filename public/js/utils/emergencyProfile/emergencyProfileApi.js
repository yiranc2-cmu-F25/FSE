export async function loadProfileData() {
  try {
    console.log("Loading profile data from /api/emergency-profiles...");
    const res = await fetch("/api/emergency-profiles", {
      method: "GET",
      credentials: "include",
      headers: {
        "Accept": "application/json",
      },
    });

    console.log("Response status:", res.status);

    if (!res.ok) {
      if (res.status === 404) {
        // Profile doesn't exist yet, that's okay
        console.log("No profile found (404), starting with empty form");
        return null;
      }
      const errorData = await res.json().catch(() => ({}));
      console.error("Error response:", errorData);
      throw new Error(errorData.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log("Profile loaded successfully:", data);
    return data;
  } catch (err) {
    console.error("Failed to load profile:", err);
    // Don't show alert on 404, it's normal if profile doesn't exist yet
    if (err.message && !err.message.includes("404")) {
      alert("Failed to load emergency profile. Please try again later.");
    }
    return null;
  }
}

export async function saveProfile(profileData) {
  const res = await fetch("/api/emergency-profiles", {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(profileData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log("Profile updated:", data);
  return data;
}

export async function deleteProfile() {
  const res = await fetch("/api/emergency-profiles", {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log("Profile deleted:", data);
  return data;
}

export async function uploadPhoto(file, visibility) {
  const formData = new FormData();
  formData.append("photo", file);
  formData.append("visibility", visibility);

  console.log("Uploading photo:", file.name, "Visibility:", visibility);

  const res = await fetch("/api/emergency-profiles/photo", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log("Photo uploaded successfully:", data);
  return data;
}

