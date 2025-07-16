export class BdORMError extends Error {
    constructor(msg: string) {
        super(`[bd-Orm Error]: ${msg}`);
        Error.captureStackTrace(this, BdORMError);
        this.name = 'BdORMError';
    }
    static staticNotImplemented(methodName: string) {
        return new BdORMError(`static ${methodName} not implemented! Set in derived class`);
    }
}
