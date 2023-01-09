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

interface TaskDoc {
	/** Task name */
	name: string;
	/** Category id referencing a {@link CategoryDoc} */
	categoryId: import("mongodb").ObjectId,
	/** Task description in Markdown */
	descriptionMd: string;
	/** Description rendered to HTML */
	descriptionRendered: string;
	/** Id of the challenge document */
	challengeId: import("mongodb").ObjectId;
	/** Hints for the user in case of difficulties */
	hints: string[];
	/** Question about patching */
	question: string;
	/** Answers to the question */
	answers: (CorrectAnswer | IncorrectAnswer)[];
	/** Whether the challenge should be visible to regular users. */
	visible: boolean;
}

interface TaskQuestionAnswerBase {
	/** Answer text */
	text: string;
	/** Whether the answer is correct */
	correct: boolean;
	/** *Optional* Explanation why the answer is (in)correct */
	explanation?: string;
}

interface CorrectAnswer extends TaskQuestionAnswerBase {
	correct: true;
}

interface IncorrectAnswer extends TaskQuestionAnswerBase {
	correct: false;
	/** Id of the challenge document if there is a {@link ChallengeDoc challenge} for this answer */
	challengeId?: import("mongodb").ObjectId;
}

interface ChallengeDoc {
	/** Docker image to pull and start */
	taskImage: string;
	/** Subdomain of the domain in settings which should be redirected to the task container */
	subdomain: string;
	/** The flag used in the task */
	flag: string;
	/** How frequently should the task be restarted. 0 - never */
	resetInterval: number;
	challengeKind: "task" | "subtask";
}
