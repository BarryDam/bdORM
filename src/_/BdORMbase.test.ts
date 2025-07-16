import { expectErrorMessage, expectToBes } from '../test-assets/jestUtils';
import BaseORM from './BdORMBase';
import { BdORMError } from './BdORMError';

describe('bd-orm baseORM', () => {
    describe('Errors if implementation has not been done', () => {
        const staticGetters = ['TABLE'];
        class SubTestWithOutImplementations extends BaseORM {}
        it('Static getters', () => {
            staticGetters.forEach(method => {
                expectErrorMessage(async () => {
                    //@ts-ignore
                    SubTestWithOutImplementations[method];
                }, BdORMError.staticNotImplemented(`get ${method}()`).message);
            });
        });
    });

    describe('public getters', () => {
        interface Sub {
            name: string;
            age: number;
        }
        class Sub extends BaseORM {
            public static PROPERTIES_NOT_ALLOWED_TO_CHANGE = ['name'];
            public static DB_TABLE = 'Sub_TABLE';
        }
        const newSubInstance = new Sub({
            name: 'Barry Dam',
            age: 38,
        });

        // All tests below are in case of a NEW entry

        expectToBes({
            'getTable()': {
                test: () => newSubInstance.getTable(),
                toBe: 'Sub_TABLE',
            },
            VIEW: { test: () => Sub.VIEW, toBe: 'Sub_TABLE' },
            getPrimaryKey: { test: () => newSubInstance.getPrimaryKey(), toBe: 'id' },
            getPrimaryKeyValue: { test: () => newSubInstance.getPrimaryKeyValue(), toBe: 0 },
            getProperty: {
                test: () => newSubInstance.getProperty('name'),
                toBe: 'Barry Dam',
            },
            getData: {
                test: () => JSON.stringify(newSubInstance.getData()),
                toBe: JSON.stringify({ name: 'Barry Dam', age: 38, id: 0 }),
            },
            getModelName: { test: () => Sub.getModelName(), toBe: 'Sub' },
            setProperty: {
                test: () => {
                    newSubInstance.setProperty('age', 40);
                    const a = newSubInstance.getProperty('age'),
                        b = newSubInstance.age;
                    return b === a && a === 40;
                },
                toBe: true,
            },
            isNew: {
                test: () => newSubInstance.isNew(),
                toBe: true,
            },
            name: {
                test: () => {
                    newSubInstance.name = 'John Doe';
                    return newSubInstance.getProperty('name');
                },
                toBe: 'John Doe',
            },
        });

        // All tests below are in case of a existing entry
        const existingSubInstance = new Sub({
            id: 1,
            name: 'Barry Dam',
            age: 38,
        });

        it("Should not allow to change the primary key after it's set", () => {
            expectErrorMessage(async () => {
                existingSubInstance.id = 2;
            }, 'Primary key cannot be changed from 1 to 2');
        });

        it("Should not allow to change the name after it's set", () => {
            expectErrorMessage(async () => {
                existingSubInstance.setProperty('name', 'new name');
            }, 'Property "name" is not allowed to be changed');
            expectErrorMessage(async () => {
                existingSubInstance.name = 'new name';
            }, 'Property "name" is not allowed to be changed');
        });
    });

    describe('Property changed checks', () => {
        class PropChanged extends BaseORM {
            public static get TABLE(): string {
                return 'PropChanged_TABLE';
            }

            static get PROPERTIES_NOT_ALLOWED_TO_CHANGE() {
                return ['age'];
            }
        }
        const propChangedNewInstance = new PropChanged({
                name: 'Barry Dam',
                age: 38,
            }),
            propChangedExistingInstance = new PropChanged({
                id: 1,
                name: 'Barry Dam',
                age: 38,
            });
        it('hasChanges checks', () => {
            expect(propChangedNewInstance.hasChanges()).toBe(false);
            propChangedNewInstance.name = 'John Doe';
            // since the name has changed, but the instance is new, it should still return false
            expect(propChangedNewInstance.hasChanges()).toBe(false);
            // existing instance fetched from db should not have changes
            expect(propChangedExistingInstance.hasChanges()).toBe(false);
            // same name as before, so no changes
            propChangedExistingInstance.name = 'Barry Dam';
            expect(propChangedExistingInstance.hasChanges()).toBe(false);
            // name has changed, so changes
            propChangedExistingInstance.name = 'John Doe';
            expect(propChangedExistingInstance.hasChanges()).toBe(true);
        });
        it('hasPropertyChanged checks', () => {
            expect(propChangedNewInstance.hasPropertyValueChanged('name')).toBe(false);
            propChangedNewInstance.name = 'John Doe';
            expect(propChangedNewInstance.hasPropertyValueChanged('name')).toBe(false);
            propChangedExistingInstance.name = 'John Doe';
            expect(propChangedExistingInstance.hasPropertyValueChanged('name')).toBe(true);
        });
        it("Should throw an error if a property that can't be changed is changed", () => {
            expectErrorMessage(async () => {
                propChangedExistingInstance.age = 40;
            }, 'Property "age" is not allowed to be changed');
        });
    });

    describe('Constructor checks', () => {
        interface ConstructorBdOrm {
            id: number;
            name: string;
        }
        class ConstructorBdOrm extends BaseORM {
            public static get REQUIRED_PROPERTIES(): string[] {
                return ['name'];
            }
        }

        it('Should throw an error if a required property is not set', () => {
            expectErrorMessage(async () => {
                new ConstructorBdOrm();
            }, 'Property "name" is required');
        });

        it('Should set the primary key to 0 on creating a new instance', () => {
            const orm = new ConstructorBdOrm({ name: 'test' });
            expect(orm.id).toBe(0);
        });
    });
});
