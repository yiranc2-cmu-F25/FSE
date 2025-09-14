// public/js/acknowledgement.js
const $ = (s) => document.querySelector(s);
const NEXT = "/profile";

function init() {
  const btn = $("#btn-understand");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = NEXT;
    });
  }
}

window.addEventListener("DOMContentLoaded", init);
