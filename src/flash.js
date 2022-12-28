/**
 * Creates a flasher middleware instance. Must be used after session is set up.
 */
export function flasher() {
	/** @type {import("express").RequestHandler} */
	const middleware = (req, _res, next) => {
		req.flash = (message, category = "message") => {
			let flashes = req.session.flashes ?? [];
			req.session.flashes = [...flashes, [message, category]];
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
				flashes = req.session.flashes ?? [];
				req._flashes = flashes;
				delete req.session.flashes;
			}
			/** @type {[string, string][]} */
			let filtered;
			let filter = typeof categories === "string" ? [categories] : categories;
			if (filter) filtered = flashes.filter(msg => filter?.includes(msg[1]));
			else filtered = flashes;

			if (withCategories) return filtered;
			return filtered.map(msg => msg[0]);
		};

		next();
	};
	return middleware;
}
