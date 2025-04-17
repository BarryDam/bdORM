"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.definePropertyDescriptors = void 0;
const BdORMError_1 = require("./BdORMError");
// Local variables
const PROPERTIES_WEAKMAP = new WeakMap(), // memory leak prevention
LOCAL_WEAKMAP = new WeakMap();
// Helper methods
const getLocalWeakMapValue = (instance, key) => {
    var _a;
    const localWeakMap = (_a = LOCAL_WEAKMAP.get(instance)) !== null && _a !== void 0 ? _a : {};
    return key in localWeakMap ? localWeakMap[key] : null;
}, getPropertyDescriptor = (instance, property) => {
    let descriptor;
    while (instance && !descriptor) {
        descriptor = Object.getOwnPropertyDescriptor(instance, property);
        instance = Object.getPrototypeOf(instance);
    }
    return descriptor;
}, definePropertyDescriptors = (instance, data) => {
    Object.keys(data).forEach(property => {
        var _a;
        const propertyDefinion = (_a = getPropertyDescriptor(instance, property)) !== null && _a !== void 0 ? _a : {};
        if (!('get' in propertyDefinion) || propertyDefinion.get === undefined) {
            propertyDefinion.get = () => {
                const value = instance.getProperty(property);
                if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
                    try {
                        return JSON.parse(value);
                    }
                    catch (e) {
                        return value;
                    }
                }
                return value;
            };
        }
        if (!('set' in propertyDefinion) || propertyDefinion.set === undefined) {
            propertyDefinion.set = (value) => {
                if (value && typeof value === 'object') {
                    try {
                        instance.setProperty(property, JSON.stringify(value));
                    }
                    catch (e) {
                        instance.setProperty(property, value);
                    }
                    return;
                }
                instance.setProperty(property, value);
            };
        }
        try {
            Object.defineProperty(instance, property, propertyDefinion);
        }
        catch (e) {
            throw new BdORMError_1.BdORMError(`Invalid property descriptor "${property}" ${propertyDefinion.value} in ${instance.constructor.name}`);
        }
        // data toevoegen
        if (data[property] !== undefined)
            instance[property] = data[property];
    });
};
exports.definePropertyDescriptors = definePropertyDescriptors;
/**
 * Class which only contains the getters and setters for the base ORM
 */
class BdORMBase {
    /**
     * @returns the model name
     */
    static getModelName() {
        return this.name;
    }
    constructor(data = {}) {
        const ormData = { ...data };
        // primary key to 0 if not present
        const primaryKey = this.getPrimaryKey();
        if (!(primaryKey in ormData)) {
            ormData[primaryKey] = 0; // 0 means new entry
        }
        // required property check
        if (this.getRequiredProperties().length > 0) {
            this.getRequiredProperties().forEach(property => {
                if (!(property in ormData))
                    throw new BdORMError_1.BdORMError(`Property "${property}" is required`);
            });
        }
        // set properties
        definePropertyDescriptors(this, ormData);
    }
    static isMethodAllowed(method, { throwErrorIfNotAllowed = false } = {}) {
        const allowed = !this.METHODS_NOT_ALLOWED.includes(method);
        if (!allowed && throwErrorIfNotAllowed) {
            throw new BdORMError_1.BdORMError(`Method "${method}" not allowed`);
        }
        return allowed;
    }
    static get TABLE() {
        if (!this.DB_TABLE)
            throw BdORMError_1.BdORMError.staticNotImplemented('get TABLE()');
        return this.DB_TABLE;
    }
    static get VIEW() {
        var _a;
        return (_a = this.DB_VIEW) !== null && _a !== void 0 ? _a : this.TABLE;
    }
    _setChangedProperties(changedProperties) {
        const local = LOCAL_WEAKMAP.get(this) || {};
        LOCAL_WEAKMAP.set(this, {
            ...local,
            changedProperties,
        });
    }
    /**
     * @returns the changed properties
     */
    getChangedProperties() {
        var _a;
        return !this.isNew() ? (_a = getLocalWeakMapValue(this, 'changedProperties')) !== null && _a !== void 0 ? _a : [] : [];
    }
    /**
     * @returns the data in json format
     * @paaam {boolean} [preventFormatting=false] - prevent formatting of the data
     */
    getData(preventFormatting = false) {
        var _a;
        const data = {}, returnData = {};
        const properties = (_a = PROPERTIES_WEAKMAP.get(this)) !== null && _a !== void 0 ? _a : {};
        Object.keys(properties).forEach(property => {
            var _a;
            data[property] = this.getProperty(property, { preventFormatting });
            returnData[property] = preventFormatting ? data[property] : (_a = this[property]) !== null && _a !== void 0 ? _a : data[property];
        });
        return returnData;
    }
    /**
     * @returns the primary key for the current table
     */
    getPrimaryKey() {
        return this.constructor.PRIMARY_KEY;
    }
    getPrimaryKeyValue() {
        return this.getProperty(this.getPrimaryKey());
    }
    /**
     * get the model property
     */
    getProperty(key, { preventFormatting = false } = {}) {
        var _a;
        const properties = (_a = PROPERTIES_WEAKMAP.get(this)) !== null && _a !== void 0 ? _a : {};
        let value = key in properties ? properties[key] : null; // never properties[key] as it can be set to null, undefined or 0
        if (!preventFormatting && value instanceof Buffer)
            value = value.toString();
        return value;
    }
    /**
     * @returns the columns of the required properties needed to create a new object
     */
    getRequiredProperties() {
        return this.constructor.REQUIRED_PROPERTIES;
    }
    /**
     * Get the table name as used in the database
     * @returns the table name as used in the database
     */
    getTable() {
        return this.constructor.TABLE;
    }
    /**
     *
     * @returns
     */
    hasChanges() {
        return this.getChangedProperties().length > 0;
    }
    /**
     * Check if the property has been changed
     */
    hasPropertyValueChanged(property) {
        return this.getChangedProperties().includes(property);
    }
    /**
     * Check if the current object is a new object
     * @returns true if the object is new, false if it is not
     */
    isNew() {
        return !this.getPrimaryKeyValue();
    }
    setProperty(property, value, { forceChange = false } = {}) {
        var _a;
        // prevent overwrite of primary key
        if (property === this.getPrimaryKey() && this.getPrimaryKeyValue() && this.getPrimaryKeyValue() !== value) {
            throw new BdORMError_1.BdORMError(`Primary key cannot be changed from ${this.getPrimaryKeyValue()} to ${value}`);
        }
        // prevent overwrite of read-only properties
        if (!forceChange &&
            !this.isNew() &&
            this.constructor.PROPERTIES_NOT_ALLOWED_TO_CHANGE.includes(property) &&
            ![undefined, null].includes(this.getProperty(property)) &&
            this.getProperty(property) != value // != is used to check for null and undefined
        ) {
            throw new BdORMError_1.BdORMError(`Property "${property}" is not allowed to be changed`);
        }
        if (!this.isNew() && this.getPrimaryKey() === property && this.getPrimaryKeyValue() !== value) {
            throw new BdORMError_1.BdORMError(`Primary key "${property}" is not allowed to be changed`);
        }
        // set changed flag
        const origValue = this.getProperty(property);
        if (![undefined, null].includes(this.getProperty(property)) && origValue !== value) {
            // todo set orig
            const changedProperties = this.getChangedProperties();
            if (!changedProperties.includes(property)) {
                changedProperties.push(property);
                this._setChangedProperties(changedProperties);
            }
        }
        // waarde instellen
        const properties = (_a = PROPERTIES_WEAKMAP.get(this)) !== null && _a !== void 0 ? _a : {};
        properties[property] = value;
        PROPERTIES_WEAKMAP.set(this, properties);
    }
}
/**
 * This method is ONLY used in the FETCH method
 * @returns the columns to fetch from the database
 */
BdORMBase.COLUMNS_TO_FETCH = '*';
/**
 * which default methods are not allowed to be used
 * for example: ['delete'] will prevent you from using model.delete();
 */
BdORMBase.METHODS_NOT_ALLOWED = [];
/**
 * Get the primary key for the current table
 * @returns the primary key for the current table
 */
BdORMBase.PRIMARY_KEY = 'id';
/**
 * Specify which properties should be set as read-only.
 * These properties can only be set once, when the object is created.
 * @return array
 */
BdORMBase.PROPERTIES_NOT_ALLOWED_TO_CHANGE = [];
/**
 * If there are values that should not be duplicated,
 * specify here which properties those should be.
 * @return array
 */
BdORMBase.PROPERTIES_NOT_ALLOWED_TO_DUPLICATE = [];
/**
 * Specify which properties are required when creating a new object.
 * @return array
 */
BdORMBase.REQUIRED_PROPERTIES = [];
exports.default = BdORMBase;
