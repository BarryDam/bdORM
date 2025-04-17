"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const BdORMBase_1 = __importStar(require("./BdORMBase"));
const BdORMError_1 = require("./BdORMError");
const _filerDataByTable = async (self) => {
    const data = self.getData(true);
    const columns = await self.constructor.getDbConnection().getTableColumns(self.getTable());
    return Object.keys(data).reduce((acc, key) => {
        if (columns.includes(key))
            acc[key] = data[key];
        return acc;
    }, {});
};
class BdORMCrud extends BdORMBase_1.default {
    // Events
    async beforeCreate(beforeCreateParams) {
        /* Overschrijf deze functie indien nodig */
    }
    async beforeUpdate(beforeUpdateParams) {
        /* Overschrijf deze functie indien nodig */
    }
    async beforeSave(beforeSaveParams) {
        /* Overschrijf deze functie indien nodig */
    }
    async afterCreate(afterCreateParams) {
        /* Overschrijf deze functie indien nodig */
    }
    async afterUpdate(afterUpdateParams) {
        /* Overschrijf deze functie indien nodig */
    }
    async afterSave(afterSaveParams) {
        /* Overschrijf deze functie indien nodig */
    }
    async beforeDelete() { }
    async afterDelete() { }
    _execDBConnectionMethod(method, ...args) {
        //@ts-ignore
        return this.constructor._DbConnection[method](...args);
    }
    async _create({ preventBeforeCreate = false, preventAfterCreate = false } = {}) {
        if (!preventBeforeCreate)
            await this.beforeCreate();
        const data = await _filerDataByTable(this), primaryKey = this.getPrimaryKey();
        if (primaryKey in data)
            delete data[primaryKey];
        const result = { ...(await this._execDBConnectionMethod('create', this.getTable(), data)) };
        const primaryKeyValue = primaryKey in result ? result[primaryKey] : false;
        if (primaryKeyValue)
            delete result[primaryKey];
        // when creating a new entry, it is not necessary to add all columns
        // and with an insert, you get all columns back from the db
        // so recreate the propertyDescriptors
        (0, BdORMBase_1.definePropertyDescriptors)(this, result);
        // important AFTER definePropertyDescriptors
        if (primaryKeyValue)
            this.setProperty(primaryKey, primaryKeyValue);
        if (!preventAfterCreate)
            await this.afterCreate();
        this._setChangedProperties([]);
        return {
            [primaryKey]: primaryKeyValue,
            ...result,
        };
    }
    async _update({ preventBeforeUpdate = false, preventAfterUpdate = false } = {}) {
        if (this.isNew())
            throw new BdORMError_1.BdORMError('Cannot update an new instance');
        if (!preventBeforeUpdate)
            await this.beforeUpdate();
        const data = await _filerDataByTable(this);
        await this._execDBConnectionMethod('update', this.getTable(), data, {
            primaryKey: this.getPrimaryKey(),
        });
        if (!preventAfterUpdate)
            await this.afterUpdate();
    }
    /**
     * Delete an instance from the database
     */
    async delete() {
        this.constructor.isMethodAllowed('delete', { throwErrorIfNotAllowed: true });
        if (!this.id) {
            throw new BdORMError_1.BdORMError('Cannot delete an instance without an id');
        }
        await this.beforeDelete();
        await this._execDBConnectionMethod('delete', this.getTable(), this.getPrimaryKeyValue(), {
            primaryKey: this.getPrimaryKey(),
        });
        await this.afterDelete();
    }
    /**
     * Duplicates the current instance and if the options asDraft is not defined or false it will be saved it to the database
     */
    async duplicate({ asDraft = false, newData = {}, excludeColumns = [] } = {}) {
        const self = this.constructor;
        self.isMethodAllowed('duplicate', { throwErrorIfNotAllowed: true });
        if (!asDraft && this.isNew())
            throw new BdORMError_1.BdORMError('Cannot duplicate an new instance');
        const data = { ...this.getData(true) };
        const primaryKey = this.getPrimaryKey();
        if (primaryKey in data)
            delete data[primaryKey];
        for (const key in data) {
            if (excludeColumns.includes(key) || self.PROPERTIES_NOT_ALLOWED_TO_DUPLICATE.includes(key)) {
                delete data[key];
                continue;
            }
            if (key in newData)
                data[key] = typeof newData[key] === 'function' ? newData[key](data[key]) : newData[key];
        }
        const newInstance = new self(data);
        if (!asDraft)
            await newInstance.save({ preventBeforeSave: true, preventAfterSave: true });
        return newInstance;
    }
    async save({ beforeSaveParams = {}, afterSaveParams = {}, preventAfterSave = false, preventBeforeSave = false, } = {}) {
        this.constructor.isMethodAllowed('save', { throwErrorIfNotAllowed: true });
        await this.beforeSave(beforeSaveParams);
        if (this.isNew()) {
            await this._create({ preventBeforeCreate: preventBeforeSave, preventAfterCreate: preventAfterSave });
        }
        else {
            await this._update({ preventBeforeUpdate: preventBeforeSave, preventAfterUpdate: preventAfterSave });
        }
        if (!preventAfterSave) {
            await this.afterSave(afterSaveParams);
        }
        return this;
    }
    // STATICS
    static async count(where, values) {
        const result = await this._DbConnection.list(this.VIEW, {
            columns: 'COUNT(*) as count',
            filters: where,
            values,
        });
        return result[0].count;
    }
    static async create(data) {
        const instance = new this(data);
        await instance.save();
        return instance;
    }
    static async fetch(where, values) {
        const results = await this._DbConnection.list(this.VIEW, {
            columns: this.COLUMNS_TO_FETCH,
            filters: where,
            values,
        });
        return results.map((result) => new this(result));
    }
    static async fetchById(id) {
        return this.fetchByPrimaryKey(id);
    }
    static async fetchOne(where, values) {
        let limit;
        if (typeof where === 'string')
            where += ' LIMIT 1';
        else
            limit = 1;
        const results = await this._DbConnection.list(this.VIEW, {
            columns: this.COLUMNS_TO_FETCH,
            filters: where,
            limit,
            values,
        });
        return (results === null || results === void 0 ? void 0 : results.length) ? new this(results[0]) : undefined;
    }
    static async fetchByPrimaryKey(primaryKeyValue) {
        const primaryKey = await this._DbConnection.getTablePrimaryKey(this.TABLE);
        const result = await this._DbConnection.read(this.VIEW, primaryKeyValue, { primaryKey });
        if (!result)
            throw new BdORMError_1.BdORMError(`No entry found for ${this.VIEW} with ${this.PRIMARY_KEY} ${primaryKeyValue}`);
        return new this(result);
    }
    static setDbConnection(dbConnection) {
        if (this._DbConnection)
            throw new BdORMError_1.BdORMError('DbConnection already set');
        this._DbConnection = dbConnection;
    }
    static clearDbConnection() {
        //@ts-ignore
        this._DbConnection = undefined;
    }
    static getDbConnection() {
        return this._DbConnection;
    }
}
exports.default = BdORMCrud;
