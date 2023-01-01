interface UserDoc {
	_id: string;
	hash: string;
	role: "user" | "admin";
}

interface CategoryDoc {
	/** Category name such as XSS, SQL Injection, etc. */
	name: string;
	/** Category description (in HTML or Markdown) */
	descriptionRaw: string;
	/** Category description format - HTML or Markdown. */
	descriptionFormat: "html" | "md";
	/** Preprocessed description in HTML, ready to insert into the page. */
	descriptionProcessed?: string;
}
