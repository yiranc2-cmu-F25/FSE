// select logout button and call Logout on click
const $ = (s) => document.querySelector(s);
const HOME = "/";
const btn = $("#logoutButton");
if (btn) {
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    await Logout();
  });
}
async function Logout() {
  //   await backendLogout();
  //   await clearClientState();
  window.location.href = HOME;
}
// select edit profile button and navigate to profile update page on click
const editBtn = $(".edit-profile-button");
if (editBtn) {
  editBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/profileUpdate";
  });
}
