import { BdORMError } from './BdORMError';

// Local variables
const PROPERTIES_WEAKMAP = new WeakMap(), // memory leak prevention
    LOCAL_WEAKMAP = new WeakMap();

// Helper methods
const getLocalWeakMapValue = (instance: BdORMBase, key: string) => {
        const localWeakMap = LOCAL_WEAKMAP.get(instance) ?? {};
        return key in localWeakMap ? localWeakMap[key] : null;
    },
    getPropertyDescriptor = (instance: BdORMBase, property: string) => {
        let descriptor;
        while (instance && !descriptor) {
            descriptor = Object.getOwnPropertyDescriptor(instance, property);
            instance = Object.getPrototypeOf(instance);
        }
        return descriptor;
    },
    definePropertyDescriptors = (instance: BdORMBase, data: Record<string, any>) => {
        Object.keys(data).forEach(property => {
            const propertyDefinion = getPropertyDescriptor(instance, property) ?? {};
            if (!('get' in propertyDefinion) || propertyDefinion.get === undefined) {
                propertyDefinion.get = () => {
                    const value = instance.getProperty(property) as string;
                    if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
                        try {
                            return JSON.parse(value);
                        } catch (e) {
                            return value;
                        }
                    }
                    return value;
                };
            }
            if (!('set' in propertyDefinion) || propertyDefinion.set === undefined) {
                propertyDefinion.set = (value: any) => {
                    if (value && typeof value === 'object') {
                        try {
                            instance.setProperty(property, JSON.stringify(value));
                        } catch (e) {
                            instance.setProperty(property, value);
                        }
                        return;
                    }
                    instance.setProperty(property, value);
                };
            }
            if ('value' in propertyDefinion && propertyDefinion.value === undefined) {
                delete propertyDefinion.value;
                if ('writable' in propertyDefinion) delete propertyDefinion.writable;
            }
            try {
                Object.defineProperty(instance, property, propertyDefinion);
            } catch (e) {
                throw new BdORMError(
                    `Invalid property descriptor "${property}" ${propertyDefinion.value} in ${instance.constructor.name}`,
                );
            }
            // data toevoegen
            if (data[property] !== undefined) instance[property] = data[property];
        });
    };

/**
 * Class which only contains the getters and setters for the base ORM
 */
abstract class BdORMBase {
    /**
     * Properties will be defined in the constructor (see definePropertyDescriptors)
     */
    [key: string]: any;

    /**
     * @returns the model name
     */
    public static getModelName(): string {
        return this.name;
    }

    constructor(data: Record<string, any> = {}) {
        const ormData = { ...data };
        // primary key to 0 if not present
        const primaryKey = this.getPrimaryKey();
        if (!(primaryKey in ormData)) {
            ormData[primaryKey] = 0; // 0 means new entry
        }
        // required property check
        if (this.getRequiredProperties().length > 0) {
            this.getRequiredProperties().forEach(property => {
                if (!(property in ormData)) throw new BdORMError(`Property "${property}" is required`);
            });
        }
        // set properties
        definePropertyDescriptors(this, ormData);
    }

    /**
     * This method is ONLY used in the FETCH method
     * @returns the columns to fetch from the database
     */
    public static readonly COLUMNS_TO_FETCH: string | string[] = '*';

    /**
     * which default methods are not allowed to be used
     * for example: ['delete'] will prevent you from using model.delete();
     */
    public static readonly METHODS_NOT_ALLOWED: string[] = [];

    /**
     * Get the primary key for the current table
     * @returns the primary key for the current table
     */
    public static readonly PRIMARY_KEY: string = 'id';

    /**
     * Specify which properties should be set as read-only.
     * These properties can only be set once, when the object is created.
     * @return array
     */
    public static readonly PROPERTIES_NOT_ALLOWED_TO_CHANGE: string[] = [];

    /**
     * If there are values that should not be duplicated,
     * specify here which properties those should be.
     * @return array
     */
    public static readonly PROPERTIES_NOT_ALLOWED_TO_DUPLICATE: string[] = [];

    /**
     * Specify which properties are required when creating a new object.
     * @return array
     */
    public static readonly REQUIRED_PROPERTIES: string[] = [];

    public static isMethodAllowed(method: string, { throwErrorIfNotAllowed = false } = {}): boolean {
        const allowed = !this.METHODS_NOT_ALLOWED.includes(method);
        if (!allowed && throwErrorIfNotAllowed) {
            throw new BdORMError(`Method "${method}" not allowed`);
        }
        return allowed;
    }

    /**
     * Get the table name as used in the database
     * @returns the table name as used in the database
     */
    public static readonly DB_TABLE: string;
    public static get TABLE(): string {
        if (!this.DB_TABLE) throw BdORMError.staticNotImplemented('get TABLE()');
        return this.DB_TABLE;
    }

    /**
     * Sometimes you want to use a custom view to read your model data
     * @returns the view name as used in the database
     */
    public static readonly DB_VIEW: string;
    public static get VIEW(): string {
        return this.DB_VIEW ?? this.TABLE;
    }

    protected _setChangedProperties(changedProperties: string[]): void {
        const local = LOCAL_WEAKMAP.get(this) || {};
        LOCAL_WEAKMAP.set(this, {
            ...local,
            changedProperties,
        });
    }

    /**
     * @returns the changed properties
     */
    public getChangedProperties(): string[] {
        return !this.isNew() ? (getLocalWeakMapValue(this, 'changedProperties') ?? []) : [];
    }

    /**
     * @returns the data in json format
     * @paaam {boolean} [preventFormatting=false] - prevent formatting of the data
     */
    getData(preventFormatting = false): Record<string, any> {
        const data: Record<string, any> = {},
            returnData: Record<string, any> = {};
        const properties = PROPERTIES_WEAKMAP.get(this) ?? {};
        Object.keys(properties).forEach(property => {
            data[property] = this.getProperty(property, { preventFormatting });
            returnData[property] = preventFormatting ? data[property] : (this[property] ?? data[property]);
        });
        return returnData;
    }

    /**
     * @returns the primary key for the current table
     */
    public getPrimaryKey(): string {
        return (this.constructor as typeof BdORMBase).PRIMARY_KEY;
    }

    public getPrimaryKeyValue(): number {
        return this.getProperty(this.getPrimaryKey()) as number;
    }

    /**
     * get the model property
     */
    public getProperty(key: string, { preventFormatting = false } = {}): string | number | null | undefined {
        const properties = PROPERTIES_WEAKMAP.get(this) ?? {};
        let value = key in properties ? properties[key] : null; // never properties[key] as it can be set to null, undefined or 0
        if (!preventFormatting && value instanceof Buffer) value = value.toString();
        return value;
    }

    /**
     * @returns the columns of the required properties needed to create a new object
     */
    public getRequiredProperties(): string[] {
        return (this.constructor as typeof BdORMBase).REQUIRED_PROPERTIES;
    }

    /**
     * Get the table name as used in the database
     * @returns the table name as used in the database
     */
    public getTable(): string {
        return (this.constructor as typeof BdORMBase).TABLE;
    }

    /**
     *
     * @returns
     */
    public hasChanges(): boolean {
        return this.getChangedProperties().length > 0;
    }

    /**
     * Check if the property has been changed
     */
    public hasPropertyValueChanged(property: string): boolean {
        return this.getChangedProperties().includes(property);
    }

    /**
     * Check if the current object is a new object
     * @returns true if the object is new, false if it is not
     */
    public isNew(): boolean {
        return !this.getPrimaryKeyValue();
    }

    public setProperty(property: string, value: any, { forceChange = false } = {}): void {
        // prevent overwrite of primary key
        if (property === this.getPrimaryKey() && this.getPrimaryKeyValue() && this.getPrimaryKeyValue() !== value) {
            throw new BdORMError(`Primary key cannot be changed from ${this.getPrimaryKeyValue()} to ${value}`);
        }
        // prevent overwrite of read-only properties
        if (
            !forceChange &&
            !this.isNew() &&
            (this.constructor as typeof BdORMBase).PROPERTIES_NOT_ALLOWED_TO_CHANGE.includes(property) &&
            ![undefined, null].includes(this.getProperty(property) as null) &&
            this.getProperty(property) != value // != is used to check for null and undefined
        ) {
            throw new BdORMError(`Property "${property}" is not allowed to be changed`);
        }
        if (!this.isNew() && this.getPrimaryKey() === property && this.getPrimaryKeyValue() !== value) {
            throw new BdORMError(`Primary key "${property}" is not allowed to be changed`);
        }
        // set changed flag
        const origValue = this.getProperty(property);
        if (![undefined, null].includes(this.getProperty(property) as null) && origValue !== value) {
            // todo set orig
            const changedProperties = this.getChangedProperties();
            if (!changedProperties.includes(property)) {
                changedProperties.push(property);
                this._setChangedProperties(changedProperties);
            }
        }
        // waarde instellen
        const properties = PROPERTIES_WEAKMAP.get(this) ?? {};
        properties[property] = value;
        PROPERTIES_WEAKMAP.set(this, properties);
    }
}

export default BdORMBase;
export { definePropertyDescriptors };
