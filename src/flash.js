/**
 * Creates a flasher middleware instance. Must be used after session is set up.
 */
export function flasher() {
	/** @type {import("express").RequestHandler} */
	const middleware = (req, res, next) => {
		req.flash = (message, category = "info") => {
			if (!req.session) return;

			/** @type {[string, string]} */
			const flash = [message, category];
			if (req._flashes) {
				req._flashes.push(flash);
			} else {
				const flashes = req.session.flashes ?? [];
				req.session.flashes = [...flashes, flash];
			}
		};

		/**
		 * @overload
		 * @param {import("./flash").GetFlashedMessagesOptions & { withCategories: true }} param0
		 * @returns {[string, string][]}
		 */
		/**
		 * @overload
		 * @param {import("./flash").GetFlashedMessagesOptions & { withCategories?: false }} param0
		 * @returns {string[]}
		 */
		/**
		 * @param {import("./flash").GetFlashedMessagesOptions} param0
		 * @returns {[string, string][] | string[]}
		 */
		// @overload support was recently merged, but has not been released yet
		// @ts-ignore
		req.getFlashedMessages = ({ categories, withCategories }) => {
			let flashes = req._flashes;
			if (!flashes) {
				if (!req.session) return [];
				flashes = req.session.flashes ?? [];
				req._flashes = flashes;
				delete req.session.flashes;
			}
			/** @type {[string, string][]} */
			let filtered;
			let filter = typeof categories === "string" ? [categories] : categories;
			if (filter) filtered = flashes.filter((msg) => filter?.includes(msg[1]));
			else filtered = flashes;

			if (withCategories) return filtered;
			return filtered.map((msg) => msg[0]);
		};

		res.locals.getFlashedMessages = req.getFlashedMessages;

		next();
	};
	return middleware;
}
