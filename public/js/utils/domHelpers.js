export function el(tag, attrs = {}, children = []) {
	const node = document.createElement(tag);
	Object.entries(attrs).forEach(([k, v]) => {
		if (k === "className") node.className = v;
		else if (k === "text") node.textContent = v;
		else if (k === "dataset") {
			Object.entries(v).forEach(([dk, dv]) => (node.dataset[dk] = dv));
		} else node.setAttribute(k, v);
	});
	children.forEach(c => node.appendChild(c));
	return node;
}

