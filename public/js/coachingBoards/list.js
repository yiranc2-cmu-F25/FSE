import { showSubscriptionModal, shouldShowSubscriptionModal, showUnsubscriptionModal, shouldShowUnsubscriptionModal } from "./subscriptionModal.js";
import { getSocket } from "../utils/socket.js";

async function fetchBoards() {
	const res = await fetch("/api/coaching-boards", { credentials: "include" });
	if (!res.ok) return [];
	return await res.json();
}

function groupByCategory(boards) {
	const grouped = boards.reduce((acc, b) => {
		(acc[b.category] = acc[b.category] || []).push(b);
		return acc;
	}, {});
	
	Object.keys(grouped).forEach(category => {
		grouped[category].sort((a, b) => {
			const titleA = (a.title || "").toLowerCase();
			const titleB = (b.title || "").toLowerCase();
			return titleA.localeCompare(titleB);
		});
	});
	
	return grouped;
}

(async function init() {
	const container = document.getElementById("boardsList");
	container.innerHTML = "";
	const boards = await fetchBoards();
	const grouped = groupByCategory(boards);
	const currentUserId = window.__CURRENT_USER_ID__;

	function isSubscribed(board) {
		return (board.subscribers || []).includes(String(currentUserId));
	}

	async function toggleSubscription(board) {
		const url = `/api/coaching-boards/${board.id}/subscriptions`;
		const method = isSubscribed(board) ? "DELETE" : "POST";
		const res = await fetch(url, { method, credentials: "include" });
		if (res.ok) {
			if (method === "POST") {
				board.subscribers = Array.from(new Set([...(board.subscribers || []), String(currentUserId)]));
			} else {
				board.subscribers = (board.subscribers || []).filter(id => id !== String(currentUserId));
			}
			return true;
		}
		return false;
	}

	const sortedCategories = Object.keys(grouped).sort((a, b) => {
		const catA = (a || "").toLowerCase();
		const catB = (b || "").toLowerCase();
		return catA.localeCompare(catB);
	});
	
	sortedCategories.forEach(category => {
		const items = grouped[category];
		const section = document.createElement("section");
		section.className = "rounded-2xl bg-white p-3 shadow ring-1 ring-stone-200";
		const header = document.createElement("div");
		header.className = "flex items-center justify-between border-b border-stone-200 px-2 py-2";
		header.innerHTML = `<h2 class="text-lg font-extrabold tracking-wide text-stone-800">${category}</h2>`;
		section.appendChild(header);

		const ul = document.createElement("ul");
		ul.className = "divide-y divide-stone-100";
		items.forEach(b => {
			const li = document.createElement("li");
			li.className = "flex items-center justify-between px-2 py-3";
			const left = document.createElement("a");
			left.href = `/boards/${b.id}`;
			left.className = "min-w-0 flex-1";
			left.innerHTML = `<h3 class="truncate text-base font-semibold text-stone-900">${b.title}</h3>`;

			const btn = document.createElement("button");
			btn.className = "ml-3 inline-flex h-9 w-9 items-center justify-center rounded-full";
			const setIcon = () => {
				btn.innerHTML = isSubscribed(b)
					? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-6 w-6 fill-yellow-400 stroke-yellow-500"><path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.702.663.321.988l-4.203 3.573a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.984 20.51a.562.562 0 0 1-.84-.61l1.285-5.386a.563.563 0 0 0-.182-.557l-4.203-3.572a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345l2.125-5.111Z"/></svg>`
					: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-6 w-6 fill-stone-300 stroke-stone-400"><path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.702.663.321.988l-4.203 3.573a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.984 20.51a.562.562 0 0 1-.84-.61l1.285-5.386a.563.563 0 0 0-.182-.557l-4.203-3.572a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345l2.125-5.111Z"/></svg>`;
			};
			setIcon();
			btn.addEventListener("click", async (e) => {
				e.preventDefault();
				e.stopPropagation();
				btn.disabled = true;
				const wasSubscribed = isSubscribed(b);
				const ok = await toggleSubscription(b);
				if (ok) {
					setIcon();
					if (!wasSubscribed && shouldShowSubscriptionModal(String(currentUserId))) {
						showSubscriptionModal(String(currentUserId));
					}
					if (wasSubscribed && shouldShowUnsubscriptionModal(String(currentUserId))) {
						showUnsubscriptionModal(String(currentUserId));
					}
				}
				btn.disabled = false;
			});

			li.appendChild(left);
			li.appendChild(btn);
			ul.appendChild(li);
		});

		section.appendChild(ul);
		container.appendChild(section);
	});
	
	getSocket();
})(); 


