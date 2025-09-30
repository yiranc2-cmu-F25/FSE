// public/js/acknowledgement.js
const $ = (s) => document.querySelector(s);
const NEXT = "/members";
const HOME = "/";

function init() {
  const btn = $("#btn-understand");
  if (btn) {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      window.location.href = NEXT;
    });
  }
}

window.addEventListener("DOMContentLoaded", init);
