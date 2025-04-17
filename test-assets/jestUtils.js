"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectToBes = exports.expectErrorMessage = void 0;
const globals_1 = require("@jest/globals");
const expectErrorMessage = async (fn, message) => {
    try {
        await fn();
        //@ts-ignore
        fail('Expected an error to be thrown');
    }
    catch (error) {
        //@ts-ignore (excepct = jest)
        if (error instanceof Error)
            return (0, globals_1.expect)(error.message).toContain(message);
        console.log(error);
        //@ts-ignore (fail = jest fail)
        fail('error is not of type Error');
    }
};
exports.expectErrorMessage = expectErrorMessage;
const expectToBes = (tests) => {
    Object.entries(tests).forEach(([title, { test, toBe }]) => {
        (0, globals_1.it)(`${title} returns ${toBe}`, () => {
            const value = test();
            (0, globals_1.expect)(value).toBe(toBe);
            (0, globals_1.expect)(value).not.toBe('RANDOM VALUE 1234567890');
        });
    });
};
exports.expectToBes = expectToBes;
