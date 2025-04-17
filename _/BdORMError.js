"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BdORMError = void 0;
class BdORMError extends Error {
    constructor(msg) {
        super(`[bd-Orm Error]: ${msg}`);
        Error.captureStackTrace(this, BdORMError);
        this.name = 'BdORMError';
    }
    static staticNotImplemented(methodName) {
        return new BdORMError(`static ${methodName} not implemented! Set in derived class`);
    }
}
exports.BdORMError = BdORMError;
