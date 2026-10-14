/** A failed API call: the HTTP status, the message and Laravel's field errors (field → message). */
export class ApiError extends Error {
    constructor(status, message, errors = {}) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}
