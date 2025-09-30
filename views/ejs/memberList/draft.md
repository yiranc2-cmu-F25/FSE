
<ul role="list" class="divide-y divide-stone-100">
            <% __users.filter(u => u.online).forEach(function(u){ %>
            <li class="px-4 py-3">
              <article class="flex items-start gap-3">
                <!-- avatar with presence -->
                <div class="relative">
                  <div
                    class="grid h-9 w-9 place-content-center rounded-full text-xs font-bold text-white"
                    style="background-color: <%= u.avatarBg %>"
                  >
                    <%= u.initials %>
                  </div>
                  <span
                    class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white"
                    aria-label="online"
                  ></span>
                </div>

                <div class="min-w-0 flex-1">
                  <div class="name-status-div flex items-center gap-2">
                    <p class="member-name truncate font-medium">
                      <%= u.name %>
                    </p>

                    <% if (u.verified) { %>
                    <span
                      title="Verified"
                      class="grid h-4 w-4 place-content-center rounded-full bg-emerald-100 text-[10px] text-emerald-700"
                      >✓</span
                    >
                    <% } %> <% if (u.status === 'HELP') { %>
                    <span
                      class="rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800"
                      >HELP</span
                    >
                    <% } else if (u.status === 'EMERGENCY') { %>
                    <span
                      class="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700"
                      >EMERGENCY</span
                    >
                    <% } %>
                  </div>

                  <!-- optional last message if you add it later -->
                  <!-- <p class="last-message mt-0.5 line-clamp-1 text-sm text-stone-600"><%= u.lastMessage %></p> -->

                  <p class="mt-0.5 text-xs text-stone-500">
                    Last seen <%= u.lastSeen %>
                  </p>
                </div>
              </article>
            </li>
            <% }); %>
          </ul>
          <ul role="list" class="divide-y divide-stone-100">
            <% __users.filter(u => u.online).forEach(function(u){ %>
            <li class="px-4 py-3">
              <article class="flex items-start gap-3">
                <!-- avatar with presence -->
                <div class="relative">
                  <div
                    class="grid h-9 w-9 place-content-center rounded-full text-xs font-bold text-white"
                    style="background-color: <%= u.avatarBg %>"
                  >
                    <%= u.initials %>
                  </div>
                  <span
                    class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white"
                    aria-label="online"
                  ></span>
                </div>

                <div class="min-w-0 flex-1">
                  <div class="name-status-div flex items-center gap-2">
                    <p class="member-name truncate font-medium">
                      <%= u.name %>
                    </p>

                    <% if (u.verified) { %>
                    <span
                      title="Verified"
                      class="grid h-4 w-4 place-content-center rounded-full bg-emerald-100 text-[10px] text-emerald-700"
                      >✓</span
                    >
                    <% } %> <% if (u.status === 'HELP') { %>
                    <span
                      class="rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800"
                      >HELP</span
                    >
                    <% } else if (u.status === 'EMERGENCY') { %>
                    <span
                      class="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700"
                      >EMERGENCY</span
                    >
                    <% } %>
                  </div>

                  <!-- optional last message if you add it later -->
                  <!-- <p class="last-message mt-0.5 line-clamp-1 text-sm text-stone-600"><%= u.lastMessage %></p> -->

                  <p class="mt-0.5 text-xs text-stone-500">
                    Last seen <%= u.lastSeen %>
                  </p>
                </div>
              </article>
            </li>
            <% }); %>
          </ul>




<ul role="list" class="divide-y divide-stone-100">
            <% __users.filter(u => !u.online).forEach(function(u){ %>
            <li class="px-4 py-3">
              <article class="flex items-start gap-3 opacity-80">
                <div class="relative">
                  <div
                    class="grid h-9 w-9 place-content-center rounded-full text-xs font-bold text-white"
                    style="background-color: <%= u.avatarBg %>"
                  >
                    <%= u.initials %>
                  </div>
                  <span
                    class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-stone-300 ring-2 ring-white"
                    aria-label="offline"
                  ></span>
                </div>

                <div class="min-w-0 flex-1">
                  <div class="name-status-div flex items-center gap-2">
                    <p class="member-name truncate font-medium">
                      <%= u.name %>
                    </p>
                    <% if (u.verified) { %>
                    <span
                      title="Verified"
                      class="grid h-4 w-4 place-content-center rounded-full bg-emerald-100 text-[10px] text-emerald-700"
                      >✓</span
                    >
                    <% } %>
                  </div>
                  <p class="mt-0.5 text-xs text-stone-500">
                    Last seen <%= u.lastSeen %>
                  </p>
                </div>
              </article>
            </li>
            <% }); %>
          </ul>