/** @type {HTMLUListElement} */ // @ts-ignore
const pagination = document.getElementById("users-pagination");
let currentPage = 1;

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
				const throwIfError = (/** @type {AdminResponse<unknown>} */ r) => {
					if (r.error) throw new Error(`${r.error}\n${r.message}`);
				};
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

/**
 * @template R
 * @typedef {import("../../src/routes/admin").AdminResponse<R>} AdminResponse<R>
 */
/** @typedef {import("../../src/routes/admin").UsersList} UsersList */
/** @typedef {import("../../src/routes/admin").ChangeUserRole} ChangeUserRole */
