import { it, expect } from '@jest/globals';
export const expectErrorMessage = async (fn: () => Promise<unknown>, message: string) => {
    try {
        await fn();
        //@ts-ignore
        fail('Expected an error to be thrown');
    } catch (error) {
        //@ts-ignore (excepct = jest)
        if (error instanceof Error) return expect(error.message).toContain(message);
        console.log(error);
        //@ts-ignore (fail = jest fail)
        fail('error is not of type Error');
    }
};

export const expectToBes = (tests: Record<string, { test: () => any; toBe: any }>) => {
    Object.entries(tests).forEach(([title, { test, toBe }]) => {
        it(`${title} returns ${toBe}`, () => {
            const value = test();
            expect(value).toBe(toBe);
            expect(value).not.toBe('RANDOM VALUE 1234567890');
        });
    });
};
