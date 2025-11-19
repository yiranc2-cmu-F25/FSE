function mountNotify() {
  if (document.getElementById("notif-root")) return;

  const root = document.createElement("div");
  root.id = "notif-root";
  root.className = "pointer-events-none fixed inset-0 z-[1000] overflow-y-auto flex flex-col items-center";
  document.body.appendChild(root);

  const tpl = document.createElement("template");
  tpl.id = "notif-toast";
  tpl.innerHTML = `
  <div class="pointer-events-auto mx-auto mt-6 w-[92%] max-w-md rounded-3xl bg-white/95 shadow-xl ring-1 ring-black/5">
    <div class="flex items-start gap-3 p-4">
      <div class="relative grid h-10 w-10 place-items-center rounded-full text-white font-semibold" data-avatar>
        <span data-initials class="text-sm"></span>
        <span class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white bg-green-500"></span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline justify-between">
          <div class="flex items-center gap-2 min-w-0">
            <div class="truncate font-semibold text-zinc-900" data-title></div>
            <span class="status-badge rounded-full px-2 py-0.5 text-[10px] font-semibold"></span>
          </div>
          <div class="ml-3 shrink-0 text-xs text-zinc-500" data-time></div>
        </div>
        <div class="mt-1 truncate text-zinc-600 text-[15px]" data-sub>1 new message</div>
      </div>
    </div>
    <div class="flex justify-end gap-2 px-4 pb-4">
      <button class="rounded-full px-3 py-1.5 text-sm ring-1 ring-zinc-300 text-zinc-700 hover:bg-zinc-50" data-dismiss>Dismiss</button>
      <button
        data-view
        class="rounded-full px-3 py-1.5 bg-[#C35F49] text-center text-sm text-white shadow hover:brightness-95"
      >
        View
      </button>
    </div>
  </div>`;
  document.body.appendChild(tpl);

  console.log("[notify] bootstrapped");
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", mountNotify, { once: true });
} else {
  mountNotify();
}


if (!document.getElementById("dm-sheet")) {
  const sheet = document.createElement("div");
  sheet.id = "dm-sheet";
  sheet.className = "fixed inset-0 z-[1100] hidden";
  sheet.innerHTML = 
  `<div class="absolute inset-0 bg-black/30" data-sheet-close></div>
    <div class="absolute left-0 right-0 bottom-0 rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 p-5">
      <ul id="dm-sheet-list" class="max-h-[45vh] overflow-y-auto space-y-6 px-1 py-4"></ul>

      <div class="mt-4">
        <button
          id="dm-sheet-reply"
          class=" bg-[#C35F49] w-full rounded-2xl px-6 py-4 text-center text-lg font-semibold text-white shadow hover:brightness-95"
        >
          Reply
        </button>
      </div>

      <template id="chat-message">
        <li class="flex items-start gap-3">
          <div class="relative avatar grid h-10 w-10 place-items-center rounded-full text-white font-semibold">
            <span class="initials text-sm"></span>
            <span class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white bg-green-500"></span>
          </div>
          <div class="content flex flex-col items-start gap-2">
            <div class="header flex items-center gap-2">
              <span class="name font-semibold"></span>
              <span class="time text-xs text-gray-500"></span>
              <span class="status-badge rounded-full px-2 py-0.5 text-[10px] font-semibold"></span>
            </div>
            <div class="bubble rounded-2xl bg-white px-4 py-3 shadow-sm"></div>
          </div>
        </li>
      </template>
  </div>`; 
  document.body.appendChild(sheet);

  sheet.querySelector("[data-sheet-close]").addEventListener("click", () => {
    sheet.classList.add("hidden");
  });
}
