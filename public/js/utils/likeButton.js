export function updateLikeButtonUI(likes, currentUserId, likeCountSpan, btn, svg) {
	const newCount = likes.length;
	const isLiked = likes.some(likeId => String(likeId) === currentUserId);
	
	likeCountSpan.textContent = newCount;
	if (isLiked) {
		btn.classList.remove("text-gray-600", "hover:text-red-600");
		btn.classList.add("text-red-600");
		svg.setAttribute("fill", "currentColor");
	} else {
		btn.classList.remove("text-red-600");
		btn.classList.add("text-gray-600", "hover:text-red-600");
		svg.setAttribute("fill", "none");
	}
}

