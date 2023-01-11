/** @type {HTMLUListElement} */ // @ts-ignore
const pagination = document.getElementById("users-pagination");
let currentPage = 1;
let categoriesMap = /** @type {Record<string, string>} */ ({});

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
const toggleCatPreviewBtn = document.getElementById("preview-toggle");
/** @type {HTMLTextAreaElement} */ // @ts-ignore
const catDescriptionTextarea = document.getElementById("category-description");
/** @type {HTMLDivElement} */ // @ts-ignore
const catPreviewDiv = document.getElementById("description-preview");
toggleCatPreviewBtn.addEventListener("change", async () => {
	if (toggleCatPreviewBtn.checked) {
		const descriptionRaw = catDescriptionTextarea.value;
		const parsed = await mdParser.parse(descriptionRaw, { async: true });
		catPreviewDiv.innerHTML = parsed;
	}
	catPreviewDiv.classList.toggle("d-none");
	catDescriptionTextarea.classList.toggle("d-none");
});
/** @type {HTMLInputElement} */ // @ts-ignore
const toggleTaskPreviewBtn = document.getElementById("task-preview-toggle");
/** @type {HTMLTextAreaElement} */ // @ts-ignore
const taskDescriptionTextarea = document.getElementById("task-description");
/** @type {HTMLDivElement} */ // @ts-ignore
const taskPreviewDiv = document.getElementById("task-description-preview");
toggleTaskPreviewBtn.addEventListener("change", async () => {
	if (toggleTaskPreviewBtn.checked) {
		const descriptionRaw = taskDescriptionTextarea.value;
		const parsed = await mdParser.parse(descriptionRaw, { async: true });
		taskPreviewDiv.innerHTML = parsed;
	}
	taskPreviewDiv.classList.toggle("d-none");
	taskDescriptionTextarea.classList.toggle("d-none");
});

import autosize from "./textarea-autosize.js";
autosize(catDescriptionTextarea);
autosize(taskDescriptionTextarea);

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
		description: catDescriptionTextarea.value,
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
	if (toggleCatPreviewBtn.checked) toggleCatPreviewBtn.click();
	catPreviewDiv.textContent = "";

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
	catDescriptionTextarea.value = descriptionRaw;
	if (toggleCatPreviewBtn.checked) toggleCatPreviewBtn.click();
	catPreviewDiv.textContent = "";
	categorySubmitBtn.textContent = "Save";

	categoryEditor.classList.remove("d-none");
	catNameElement.focus();
	categoryEditor.scrollIntoView();
	// dispatch an input event to resize the textarea **after** scrolling
	setTimeout(() => catDescriptionTextarea.dispatchEvent(new Event("input")), 100);
}

async function loadCategories() {
	/** @type {AdminResponse<CategoriesList>} */
	const response = await fetch("/admin/categories").then((r) => r.json());
	if (response.error !== null) throw new Error(`${response.error}\n${response.message}`);
	/** @type {HTMLTemplateElement} */ // @ts-ignore
	const categoryTemplate = document.getElementById("category-template");
	const categoriesFragment = new DocumentFragment();
	const optionsFragment = new DocumentFragment();
	for (const cat of response.categories) {
		/** @type {HTMLDivElement} */ // @ts-ignore
		const clone = categoryTemplate.content.firstElementChild.cloneNode(true);
		const { _id, name, descriptionRaw, descriptionProcessed } = cat; // @ts-ignore
		categoriesMap[_id] = name;
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

		// @ts-ignore - object serialized from JSON, _id is a string representation of ObjectId
		optionsFragment.appendChild(new Option(name, _id));
	}
	document.getElementById("categoriesAccordionContainer")?.replaceChildren(categoriesFragment);
	document.getElementById("task-category")?.replaceChildren(optionsFragment);
}

/** @type {HTMLDivElement} */ // @ts-ignore
const taskEditor = document.getElementById("task-editor");
/** @type {HTMLFormElement} */ // @ts-ignore
const taskForm = document.getElementById("task-form");
/** @type {HTMLInputElement} */ // @ts-ignore
const taskNameElement = taskForm.elements.namedItem("name");
/** @type {HTMLOListElement} */ // @ts-ignore
const hintsList = document.getElementById("task-hints-list");

document.getElementById("new-task-btn")?.addEventListener("click", () => {
	if (toggleTaskPreviewBtn.checked) toggleTaskPreviewBtn.click();

	taskEditor.classList.remove("d-none");
	taskNameElement.focus();
});

document.getElementById("task-btn-cancel")?.addEventListener("click", (e) => {
	e.preventDefault();
	taskEditor.classList.add("d-none");
});

document.getElementById("task-add-hint")?.addEventListener("click", (e) => {
	e.preventDefault();
	/** @type {HTMLTemplateElement} */ // @ts-ignore
	addHintInput(true);
});

addHintInput();

/**
 * @param {boolean | undefined} [focus]
 */
function addHintInput(focus) {
	const hintTemplate = document.getElementById("hint-template");
	/** @type {HTMLLIElement} */ // @ts-ignore
	const hintInput = hintTemplate.content.firstElementChild.cloneNode(true);
	hintInput.querySelector("button")?.addEventListener(
		"click",
		(e) => {
			e.preventDefault();
			hintsList.removeChild(hintInput);
		},
		{ once: true }
	);
	hintsList.appendChild(hintInput);
	focus && hintInput.querySelector("input")?.focus();
}

/**
 * @param {boolean} [focus]
 */
function addAnswer(focus) {
	/** @type {HTMLDivElement} */ // @ts-ignore
	const answersContainer = document.getElementById("answers-container");
	/** @type {HTMLTemplateElement} */ // @ts-ignore
	const answerTemplate = document.getElementById("answer-template");
	/** @type {HTMLFieldSetElement} */ // @ts-ignore
	const answerFragment = answerTemplate.content.firstElementChild.cloneNode(true);
	const n = answersContainer.childElementCount;

	const taskAnswerTextId = `task-answer-${n}-text`;
	const taskAnswerTextHelpId = taskAnswerTextId + "-help";
	/** @type {HTMLInputElement} */ // @ts-ignore
	const taskAnswerText = answerFragment.querySelector("#task-answer-x-text");
	answerFragment
		.querySelector('[for="task-answer-x-text"]')
		?.setAttribute("for", taskAnswerTextId);
	taskAnswerText.id = taskAnswerTextId;
	taskAnswerText.setAttribute("aria-describedby", taskAnswerTextHelpId);
	// @ts-ignore
	answerFragment.querySelector("#task-answer-x-text-help").id = taskAnswerTextHelpId;

	const correctCheckboxId = `task-answer-${n}-correct`;
	/** @type {HTMLInputElement} */ // @ts-ignore
	const correctCheckbox = answerFragment.querySelector("#task-answer-x-correct");
	correctCheckbox.id = correctCheckboxId;
	answerFragment
		.querySelector('[for="task-answer-x-correct"]')
		?.setAttribute("for", correctCheckboxId);

	const addChallengeCheckboxId = `task-answer-${n}-add-challenge`;
	/** @type {HTMLInputElement} */ // @ts-ignore
	const addChallengeCheckbox = answerFragment.querySelector("#task-answer-x-add-challenge");
	addChallengeCheckbox.id = addChallengeCheckboxId;
	answerFragment
		.querySelector('[for="task-answer-x-add-challenge"]')
		?.setAttribute("for", addChallengeCheckboxId);

	const explanationId = `task-answer-${n}-explanation`;
	answerFragment
		.querySelector('[for="task-answer-x-explanation"]')
		?.setAttribute("for", explanationId);
	// @ts-ignore
	answerFragment.querySelector("#task-answer-x-explanation").id = explanationId;

	/** @type {HTMLFieldSetElement} */ // @ts-ignore
	const challengeDetailsFieldset = answerFragment.querySelector(
		"fieldset#task-answer-x-challenge"
	);
	challengeDetailsFieldset.id = `task-answer-${n}-challenge`;

	const imageId = `task-answer-${n}-image`;
	answerFragment.querySelector('[for="task-answer-x-image"]')?.setAttribute("for", imageId);
	// @ts-ignore
	answerFragment.querySelector("#task-answer-x-image").id = imageId;

	const subdomainId = `task-answer-${n}-subdomain`;
	answerFragment
		.querySelector('[for="task-answer-x-subdomain"]')
		?.setAttribute("for", subdomainId);
	// @ts-ignore
	answerFragment.querySelector("#task-answer-x-subdomain").id = subdomainId;

	const flagId = `task-answer-${n}-flag`;
	answerFragment.querySelector('[for="task-answer-x-flag"]')?.setAttribute("for", flagId);
	// @ts-ignore
	answerFragment.querySelector("#task-answer-x-flag").id = flagId;

	const intervalId = `task-answer-${n}-interval`;
	const intervalHelpId = intervalId + "-help";
	answerFragment.querySelector('[for="task-answer-x-interval"]')?.setAttribute("for", intervalId);
	/** @type {HTMLInputElement} */ // @ts-ignore
	const intervalInput = answerFragment.querySelector("#task-answer-x-interval");
	intervalInput.id = intervalId;
	intervalInput.setAttribute("aria-describedby", intervalHelpId);
	// @ts-ignore
	answerFragment.querySelector("#task-answer-x-interval-help").id = intervalHelpId;

	addChallengeCheckbox.addEventListener("click", () =>
		challengeDetailsFieldset.classList.toggle("d-none")
	);
	correctCheckbox.addEventListener("click", () => {
		if (correctCheckbox.checked) {
			addChallengeCheckbox.disabled = true;
			addChallengeCheckbox.checked = false;
			challengeDetailsFieldset.classList.add("d-none");
		} else {
			addChallengeCheckbox.disabled = false;
		}
	});

	answersContainer.appendChild(answerFragment);
	if (focus) answerFragment.querySelector("input")?.focus();
}

document.getElementById("task-add-answer")?.addEventListener("click", (e) => {
	e.preventDefault();
	addAnswer(true);
});

addAnswer();

taskForm.addEventListener("submit", (e) => {
	e.preventDefault();
	const data = {
		name: /** @type {HTMLInputElement} */ (taskForm.elements.namedItem("name")).value,
		category: /** @type {HTMLSelectElement} */ (taskForm.elements.namedItem("category")).value,
		description: taskDescriptionTextarea.value,
		taskImage: /** @type {HTMLInputElement} */ (taskForm.elements.namedItem("taskImage")).value,
		subdomain: /** @type {HTMLInputElement} */ (taskForm.elements.namedItem("subdomain")).value,
		flag: /** @type {HTMLInputElement} */ (taskForm.elements.namedItem("flag")).value,
		resetInterval: Number.parseInt(
			/** @type {HTMLInputElement} */ (taskForm.elements.namedItem("resetInterval")).value
		),
		hints: /** @type {string[]} */ ([]),
		question: /** @type {HTMLInputElement} */ (taskForm.elements.namedItem("question")).value,
		answers: /** @type {any[]} */ ([]),
		visible: true,
	};

	/** @type {NodeListOf<HTMLInputElement>} */
	const hintElements = taskForm.querySelectorAll('input[name="hint[]"]');
	for (const hintInput of hintElements) {
		const val = hintInput.value;
		if (val) data.hints.push(val);
	}

	const n = document.getElementById("answers-container")?.childElementCount ?? 0;
	for (let i = 0; i < n; ++i) {
		const prefix = `task-answer-${i}-`;
		/** @type {(IncorrectAnswer & Partial<Omit<ChallengeDoc, "challengeKind">>) | CorrectAnswer} */
		const answer = {
			// @ts-ignore
			text: document.getElementById(prefix + "text").value, // @ts-ignore
			correct: document.getElementById(prefix + "correct").checked,
		};

		// @ts-ignore
		const explanation = document.getElementById(prefix + "explanation").value;
		if (explanation) answer.explanation = explanation;

		// @ts-ignore
		if (document.getElementById(prefix + "add-challenge").checked && !answer.correct) {
			// @ts-ignore
			answer.taskImage = document.getElementById(prefix + "image").value; // @ts-ignore
			answer.subdomain = document.getElementById(prefix + "subdomain").value; // @ts-ignore
			answer.flag = document.getElementById(prefix + "flag").value;
			answer.resetInterval = Number.parseInt(
				// @ts-ignore
				document.getElementById(prefix + "interval").value
			);
		}

		data.answers.push(answer);
	}

	fetch(taskForm.action, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	})
		.then((r) => r.json())
		.then(throwIfError)
		.then(() => {
			taskForm.reset();
			taskEditor.classList.add("d-none");
			return loadTasks();
		})
		.catch((e) => console.error(e));
});

/**
 * Fills the `rootElement` with data from `dataObj`
 * @param {Element} rootElement A node to be filled
 * @param {Record<string, any>} dataObj Data
 */
function templateRenderer(rootElement, dataObj, prefix = "") {
	for (const [key, value] of Object.entries(dataObj)) {
		const htmlKey = escapeHtml(prefix + key);
		const toShow = rootElement.querySelectorAll(`[data-show-if="${htmlKey}"]`);
		for (const e of toShow) {
			if (e instanceof HTMLElement || e instanceof SVGElement) e.classList.remove("d-none");
		}
		const elements = rootElement.querySelectorAll(`[data-field="${htmlKey}"]`);
		if (!elements.length) continue;

		if (Array.isArray(value)) {
			for (const elem of elements) {
				if (!(elem instanceof HTMLElement || elem instanceof SVGElement)) continue;

				const toRepeatQuery = elem.dataset.repeat;
				if (!toRepeatQuery) continue;

				// Repeat only the first occurrence
				const repeat = elem.querySelector(toRepeatQuery);
				if (!(repeat instanceof HTMLElement || repeat instanceof SVGElement)) continue;

				// Only arrays of objects and simple values (string, number, bool) are supported
				const frag = new DocumentFragment();
				for (const arrayElement of value) {
					const clone = repeat.cloneNode(true);
					if (!(clone instanceof HTMLElement || clone instanceof SVGElement)) break;
					if (typeof arrayElement === "object") {
						templateRenderer(clone, arrayElement, `${prefix}${key}.`);
					} else {
						templateRendererSimpleVal(clone, arrayElement);
					}
					frag.appendChild(clone);
				}
				repeat.parentNode?.replaceChild(frag, repeat);
			}
		} else if (typeof value === "object") {
			for (const elem of elements) {
				templateRenderer(elem, value, `${prefix}${key}.`);
			}
		} else {
			for (const elem of elements) {
				if (!(elem instanceof HTMLElement || elem instanceof SVGElement)) continue;

				templateRendererSimpleVal(elem, value);
			}
		}
	}
}

/**
 * Internal templateRenderer function
 * @param {HTMLElement | SVGElement} elem Template element
 * @param {any} value Simple (convertible to string) value to apply
 */
function templateRendererSimpleVal(elem, value) {
	const setAttr = elem.dataset.setAttr;
	const raw = elem.dataset.raw;
	if (setAttr) {
		if (typeof value === "boolean") {
			if (value) elem.setAttribute(setAttr, "");
			else elem.removeAttribute(setAttr);
		} else {
			elem.setAttribute(setAttr, String(value));
		}
	}
	if (raw) {
		elem.innerHTML = value;
	} else {
		elem.textContent = value;
	}
}

async function loadTasks() {
	const response = await fetch("/admin/tasks");
	const data = await response.json();
	throwIfError(data);
	const { tasks } = data;
	/** @type {HTMLTemplateElement} */ // @ts-ignore
	const template = document.getElementById("task-item-template");
	const frag = new DocumentFragment();
	for (const task of tasks) {
		task.category = categoriesMap[task.categoryId];
		const it = template.content.firstElementChild?.cloneNode(true);
		if (!(it instanceof HTMLElement)) break;

		templateRenderer(it, task);

		const taskId = `task-${task._id}`; // @ts-ignore
		it.querySelector("#task-x").id = taskId;
		it.querySelector('[aria-labelledby="task-x"]')?.setAttribute("aria-labelledby", taskId);

		const collapseId = `taskCollapse-${task._id}`;
		/** @type {HTMLButtonElement} */ // @ts-ignore
		const button = it.querySelector('button[aria-controls="taskCollapse-x"]'); // @ts-ignore
		it.querySelector("#taskCollapse-x").id = collapseId;
		button.setAttribute("aria-controls", collapseId);
		button.dataset.bsTarget = "#" + collapseId;

		frag.appendChild(it);
	}
	document.getElementById("tasksAccordionContainer")?.replaceChildren(frag);
}

loadCategories()
	.then(() => loadTasks())
	.catch((e) => console.error(e));

function escapeHtml(/** @type {string} */ unsafe) {
	return unsafe
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

/**
 * @template R
 * @typedef {import("../../src/routes/admin").AdminResponse<R>} AdminResponse<R>
 */
/** @typedef {import("../../src/routes/admin").UsersList} UsersList */
/** @typedef {import("../../src/routes/admin").ChangeUserRole} ChangeUserRole */
/** @typedef {import("../../src/routes/admin").CategoriesList} CategoriesList */
