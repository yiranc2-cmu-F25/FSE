export async function loadInfo() {
  try {
    const res = await fetch("/api/authentications/accounts", {
      credentials: "include",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const user = await res.json();
    //console.log("✅ Fetched current user:", user);
    return user; 
  } catch (err) {
    console.error("❌ Failed to fetch current user:", err);
    return null; 
  }
}