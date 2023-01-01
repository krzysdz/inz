/** @type {HTMLUListElement} */ // @ts-ignore
const pagination = document.getElementById("users-pagination");
let currentPage = 1;

/**
 * Throws an error if `r.error` is truthy
 * @param {AdminResponse<unknown>} r
 */
function throwIfError(r) {
	if (r.error) throw new Error(`${r.error}\n${r.message}`);
}

async function loadUsers(page = 1, size = 10) {
	const url = new URL("/admin/users", window.location.href);
	url.searchParams.set("page", page.toString());
	url.searchParams.set("size", size.toString());

	try {
		/** @type {AdminResponse<UsersList>} */
		const response = await fetch(url).then((r) => r.json());
		if (response.error !== null) throw new Error(`${response.error}\n${response.message}`);

		/** @type {HTMLTemplateElement} */ // @ts-ignore
		const rowTemplate = document.getElementById("user-row-template");
		const rowsFragment = new DocumentFragment();
		for (const user of response.users) {
			/** @type {HTMLTableRowElement} */ // @ts-ignore
			const row = rowTemplate.content.firstElementChild.cloneNode(true);
			// @ts-ignore
			row.querySelector('[data-cell-role="username"]').textContent = user.username;
			// @ts-ignore
			row.querySelector('[data-cell-role="role"]').textContent = user.role;
			/** @type {HTMLButtonElement} */ // @ts-ignore
			const toggleRoleBtn = row.querySelector('[data-button-action="role"]');
			/** @type {HTMLButtonElement} */ // @ts-ignore
			const deleteUserBtn = row.querySelector('[data-button-action="delete"]');
			if (user.username === document.documentElement.dataset.username) {
				toggleRoleBtn.disabled = true;
				deleteUserBtn.disabled = true;
			} else {
				toggleRoleBtn.addEventListener("click", () =>
					fetch(`/admin/users/${encodeURIComponent(user.username)}`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ role: user.role === "admin" ? "user" : "admin" }),
					})
						.then((r) => r.json())
						.then(throwIfError)
						.catch((e) => console.error(e))
						.finally(() => loadUsers(currentPage))
				);
				deleteUserBtn.addEventListener("click", () =>
					fetch(`/admin/users/${encodeURIComponent(user.username)}`, { method: "DELETE" })
						.then((r) => r.json())
						.then(throwIfError)
						.catch((e) => console.error(e))
						.finally(() => loadUsers(currentPage))
				);
			}
			rowsFragment.appendChild(row);
		}
		/** @type {HTMLTableSectionElement} */ // @ts-ignore
		const tbody = document.getElementById("users-tbody");
		tbody.classList.remove("placeholder-wave");
		tbody.replaceChildren(rowsFragment);

		updatePagination(response);
	} catch (error) {
		console.error(error);
	}
}

function updatePagination({ count = 0, page = 1, size = 0 }) {
	currentPage = page;
	const totalPages = Math.ceil(count / size);
	const currentPaginationPages = pagination.childElementCount - 2;
	/** @type {HTMLAnchorElement} */ // @ts-ignore
	const prevLink = pagination.querySelector("[data-page=prev]");
	/** @type {HTMLAnchorElement} */ // @ts-ignore
	const nextLink = pagination.querySelector("[data-page=next]");

	if (page > 1) prevLink.classList.remove("disabled");
	else prevLink.classList.add("disabled");
	if (page < totalPages) nextLink.classList.remove("disabled");
	else nextLink.classList.add("disabled");

	if (currentPaginationPages < totalPages) {
		const diff = totalPages - currentPaginationPages;
		/** @type {HTMLTemplateElement} */ // @ts-ignore
		const paginationItemTemplate = document.getElementById("pagination-link-template");
		const additionalPagination = new DocumentFragment();
		for (let i = 1; i <= diff; i++) {
			/** @type {HTMLLIElement} */ // @ts-ignore
			const paginationItem = paginationItemTemplate.content.firstElementChild.cloneNode(true);
			/** @type {HTMLAnchorElement} */ // @ts-ignore
			const paginationLink = paginationItem.firstElementChild;
			const pageNumStr = (currentPaginationPages + i).toString();
			paginationLink.textContent = pageNumStr;
			paginationLink.dataset.page = pageNumStr;
			additionalPagination.appendChild(paginationItem);
		}
		pagination.insertBefore(additionalPagination, nextLink.parentNode);
	} else if (currentPaginationPages > totalPages) {
		/** @type {NodeListOf<HTMLAnchorElement>} */
		const allPaginationLinks = pagination.querySelectorAll("a[data-page]");
		for (const paginationLink of allPaginationLinks) {
			const linkPageStr = paginationLink.dataset.page;
			const linkPage = Number.parseInt(linkPageStr ?? "");
			if (Number.isNaN(linkPage) || linkPage <= totalPages) continue;

			// @ts-ignore
			pagination.removeChild(paginationLink.parentNode);
		}
	}

	/** @type {NodeListOf<HTMLAnchorElement>} */
	const activePaginationLinks = pagination.querySelectorAll("a[data-page].active");
	activePaginationLinks.forEach((link) => link.classList.remove("active"));
	pagination.querySelector(`a[data-page="${page}"]`)?.classList.add("active");
}

loadUsers();

pagination.addEventListener("click", (e) => {
	const target = e.target;
	if (
		!(target instanceof HTMLAnchorElement) ||
		target.classList.contains("active") ||
		target.classList.contains("disabled")
	)
		return;

	const { page } = target.dataset;
	let newPage = 1;
	if (page === "prev") newPage = currentPage - 1;
	else if (page === "next") newPage = currentPage + 1;
	else if (typeof page === "string") {
		newPage = Number.parseInt(page);
	}
	if (!Number.isNaN(newPage)) loadUsers(newPage);
});

/** @type {import("marked").marked} */ // @ts-ignore
// eslint-disable-next-line no-undef
const mdParser = marked.marked;
/** @type {import("highlight.js").default} */ // @ts-ignore
// eslint-disable-next-line no-undef
const highlighter = hljs;

mdParser.setOptions({
	highlight: (code, lang) => {
		const language = highlighter.getLanguage(lang) ? lang : "plaintext";
		return highlighter.highlight(code, { language }).value;
	},
	langPrefix: "hljs language-",
});

/** @type {HTMLInputElement} */ // @ts-ignore
const togglePreviewBtn = document.getElementById("preview-toggle");
/** @type {HTMLTextAreaElement} */ // @ts-ignore
const descriptionTextarea = document.getElementById("category-description");
/** @type {HTMLDivElement} */ // @ts-ignore
const previewDiv = document.getElementById("description-preview");
togglePreviewBtn.addEventListener("change", async () => {
	if (togglePreviewBtn.checked) {
		const descriptionRaw = descriptionTextarea.value;
		const parsed = await mdParser.parse(descriptionRaw, { async: true });
		previewDiv.innerHTML = parsed;
	}
	previewDiv.classList.toggle("d-none");
	descriptionTextarea.classList.toggle("d-none");
});

import autosize from "./textarea-autosize.js";
autosize(descriptionTextarea);

/** @type {HTMLDivElement} */ // @ts-ignore
const categoryEditor = document.getElementById("category-editor");
/** @type {HTMLHeadingElement} */ // @ts-ignore
const categoryEditHeader = document.getElementById("category-edit-header");
/** @type {HTMLFormElement} */ // @ts-ignore
const categoryForm = document.getElementById("category-form");
/** @type {HTMLButtonElement} */ // @ts-ignore
const categorySubmitBtn = document.getElementById("category-btn-submit");
/** @type {HTMLInputElement} */ // @ts-ignore
const catNameElement = categoryForm.elements.namedItem("name");

document.getElementById("category-btn-cancel")?.addEventListener("click", (e) => {
	e.preventDefault();
	categoryEditor.classList.add("d-none");
});

categoryForm.addEventListener("submit", (e) => {
	e.preventDefault();
	let target = categoryForm.action;
	if (categoryForm.dataset.operation === "edit") target += "/" + categoryForm.dataset.cid;

	const categoryDoc = {
		name: catNameElement.value,
		description: descriptionTextarea.value,
		// @ts-ignore
		descriptionFormat: categoryForm.elements.namedItem("descriptionFormat").value,
	};
	fetch(target, {
		method: categoryForm.dataset.operation === "edit" ? "PUT" : "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(categoryDoc),
	})
		.then((r) => r.json())
		.then(throwIfError)
		.then(() => categoryEditor.classList.add("d-none"))
		.catch((e) => console.error(e))
		.finally(() => loadCategories())
		.catch((e) => console.error(e));
});

function createCategory() {
	if (categoryForm.dataset.opera !== "create") {
		categoryForm.reset();
		categoryEditHeader.textContent = "New category";
		categoryForm.dataset.cid = "";
		categoryForm.dataset.operation = "create";
		categorySubmitBtn.textContent = "Create";
	}
	if (togglePreviewBtn.checked) togglePreviewBtn.click();
	previewDiv.textContent = "";

	categoryEditor.classList.remove("d-none");
	catNameElement.focus();
}
document.getElementById("new-category-btn")?.addEventListener("click", createCategory);

/**
 * @param {MouseEvent} e
 */
function editCategory(e) {
	// @ts-ignore
	const { cid, name, descriptionRaw } = e.target.dataset;
	categoryForm.reset();
	categoryEditHeader.textContent = "Edit category";
	categoryForm.dataset.cid = cid;
	categoryForm.dataset.operation = "edit";
	catNameElement.value = name;
	descriptionTextarea.value = descriptionRaw;
	if (togglePreviewBtn.checked) togglePreviewBtn.click();
	previewDiv.textContent = "";
	categorySubmitBtn.textContent = "Save";

	categoryEditor.classList.remove("d-none");
	catNameElement.focus();
	categoryEditor.scrollIntoView();
	// dispatch an input event to resize the textarea **after** scrolling
	setTimeout(() => descriptionTextarea.dispatchEvent(new Event("input")), 100);
}

async function loadCategories() {
	/** @type {AdminResponse<CategoriesList>} */
	const response = await fetch("/admin/categories").then((r) => r.json());
	if (response.error !== null) throw new Error(`${response.error}\n${response.message}`);
	/** @type {HTMLTemplateElement} */ // @ts-ignore
	const categoryTemplate = document.getElementById("category-template");
	const categoriesFragment = new DocumentFragment();
	for (const cat of response.categories) {
		/** @type {HTMLDivElement} */ // @ts-ignore
		const clone = categoryTemplate.content.firstElementChild.cloneNode(true);
		const { _id, name, descriptionRaw, descriptionProcessed } = cat;
		const headerId = `category-${_id}`;
		const collapseId = `categoryCollapse-${_id}`;

		/** @type {HTMLHeadingElement} */ // @ts-ignore
		const header = clone.querySelector("#category-x.accordion-header");
		header.id = headerId;
		/** @type {HTMLButtonElement} */ // @ts-ignore
		const headerButton = header.firstElementChild;
		headerButton.setAttribute("data-bs-target", "#" + collapseId);
		headerButton.setAttribute("aria-controls", collapseId);
		headerButton.textContent = name;
		/** @type {HTMLDivElement} */ // @ts-ignore
		const collapseDiv = clone.querySelector("#categoryCollapse-x.accordion-collapse");
		collapseDiv.id = collapseId;
		collapseDiv.setAttribute("aria-labelledby", headerId);
		/** @type {HTMLButtonElement} */ // @ts-ignore
		const editBtn = collapseDiv.querySelector("button");
		editBtn.dataset.cid = _id.toString();
		editBtn.dataset.name = name;
		editBtn.dataset.descriptionRaw = descriptionRaw;
		editBtn.addEventListener("click", editCategory);
		/** @type {HTMLDivElement} */ // @ts-ignore
		const content = collapseDiv.firstElementChild.firstElementChild;
		content.innerHTML = descriptionProcessed ? descriptionProcessed : descriptionRaw;

		categoriesFragment.appendChild(clone);
	}
	document.getElementById("categoriesAccordionContainer")?.replaceChildren(categoriesFragment);
}

loadCategories().catch((e) => console.error(e));

/**
 * @template R
 * @typedef {import("../../src/routes/admin").AdminResponse<R>} AdminResponse<R>
 */
/** @typedef {import("../../src/routes/admin").UsersList} UsersList */
/** @typedef {import("../../src/routes/admin").ChangeUserRole} ChangeUserRole */
/** @typedef {import("../../src/routes/admin").CategoriesList} CategoriesList */
