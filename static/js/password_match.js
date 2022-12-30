/** @type {HTMLInputElement} */ // @ts-ignore
const password = document.getElementById("password");
/** @type {HTMLInputElement} */ // @ts-ignore
const rePassword = document.getElementById("password-retype");

function validatePasswords(/** @type {boolean | undefined} */ report) {
	if (rePassword.value !== password.value) {
		rePassword.setCustomValidity("Passwords do not match.");
	} else {
		rePassword.setCustomValidity("");
	}
	if (report) return rePassword.reportValidity();
}

rePassword.addEventListener("input", () => {
	validatePasswords(true);
});
password.addEventListener("input", () => validatePasswords(false));
rePassword.form?.addEventListener("submit", (e) => {
	if (!validatePasswords(true)) e.preventDefault();
});
