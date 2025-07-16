import BdORMBase, { definePropertyDescriptors } from './BdORMBase';
import { BdORMError } from './BdORMError';
import type BdOrmDbConnection from './BdOrmConnection';

type MethodParams<K extends string> = {
    [key in K]?: any;
};

export type BdORMDuplicateNewDataMethod = (v: any) => string | boolean | null | number;
export interface BdORMDuplicateParams {
    asDraft?: boolean; // if true, the duplicate will be created as a draft and not saved to the db
    newData?: { [key: string]: string | boolean | null | number | BdORMDuplicateNewDataMethod };
    excludeColumns?: string[];
}

const _filerDataByTable = async (self: BdORMCrud): Promise<Record<string, any>> => {
    const data = self.getData(true);
    const columns = await (self.constructor as typeof BdORMCrud).getDbConnection().getTableColumns(self.getTable());
    return Object.keys(data).reduce((acc, key) => {
        if (columns.includes(key)) acc[key] = data[key];
        return acc;
    }, {} as Record<string, any>);
};

export default class BdORMCrud extends BdORMBase {
    private static _DbConnection: InstanceType<typeof BdOrmDbConnection>;

    // Events
    protected async beforeCreate<K extends string>(beforeCreateParams?: MethodParams<K>) {
        /* Overschrijf deze functie indien nodig */
    }
    protected async beforeUpdate<K extends string>(beforeUpdateParams?: MethodParams<K>) {
        /* Overschrijf deze functie indien nodig */
    }
    protected async beforeSave<K extends string>(beforeSaveParams?: MethodParams<K>) {
        /* Overschrijf deze functie indien nodig */
    }
    protected async afterCreate<K extends string>(afterCreateParams?: MethodParams<K>) {
        /* Overschrijf deze functie indien nodig */
    }
    protected async afterUpdate<K extends string>(afterUpdateParams?: MethodParams<K>) {
        /* Overschrijf deze functie indien nodig */
    }
    protected async afterSave<K extends string>(afterSaveParams?: MethodParams<K>) {
        /* Overschrijf deze functie indien nodig */
    }
    protected async beforeDelete() {}
    protected async afterDelete() {}

    private _execDBConnectionMethod(
        method: 'create',
        table: string,
        data: Record<string, any>,
    ): Promise<Record<string, any>>;
    private _execDBConnectionMethod(
        method: 'update',
        table: string,
        data: Record<string, any>,
        options?: { primaryKey: string },
    ): Promise<Record<string, any>>;
    private _execDBConnectionMethod(
        method: 'delete',
        table: string,
        primaryKeyValue: string | number,
        options?: { primaryKey: string },
    ): Promise<unknown>;
    private _execDBConnectionMethod(method: keyof BdOrmDbConnection, ...args: any[]): Promise<any> {
        //@ts-ignore
        return (this.constructor as typeof BdORMCrud)._DbConnection[method](...args);
    }

    private async _create({ preventBeforeCreate = false, preventAfterCreate = false } = {}): Promise<
        Record<string, any>
    > {
        if (!preventBeforeCreate) await this.beforeCreate();
        const data = await _filerDataByTable(this),
            primaryKey = this.getPrimaryKey();
        if (primaryKey in data) delete data[primaryKey];
        const result = { ...(await this._execDBConnectionMethod('create', this.getTable(), data)) };
        const primaryKeyValue = primaryKey in result ? result[primaryKey] : false;
        if (primaryKeyValue) delete result[primaryKey];
        // when creating a new entry, it is not necessary to add all columns
        // and with an insert, you get all columns back from the db
        // so recreate the propertyDescriptors
        definePropertyDescriptors(this, result);
        // important AFTER definePropertyDescriptors
        if (primaryKeyValue) this.setProperty(primaryKey, primaryKeyValue);
        if (!preventAfterCreate) await this.afterCreate();
        this._setChangedProperties([]);
        return {
            [primaryKey]: primaryKeyValue,
            ...result,
        };
    }

    private async _update({ preventBeforeUpdate = false, preventAfterUpdate = false } = {}): Promise<void> {
        if (this.isNew()) throw new BdORMError('Cannot update an new instance');
        if (!preventBeforeUpdate) await this.beforeUpdate();
        const data = await _filerDataByTable(this);
        await this._execDBConnectionMethod('update', this.getTable(), data, {
            primaryKey: this.getPrimaryKey(),
        });
        if (!preventAfterUpdate) await this.afterUpdate();
    }

    /**
     * Delete an instance from the database
     */
    async delete(): Promise<void> {
        (this.constructor as typeof BdORMCrud).isMethodAllowed('delete', { throwErrorIfNotAllowed: true });
        if (!this.id) {
            throw new BdORMError('Cannot delete an instance without an id');
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
    async duplicate({ asDraft = false, newData = {}, excludeColumns = [] }: BdORMDuplicateParams = {}): Promise<
        InstanceType<typeof BdORMCrud>
    > {
        const self = this.constructor as typeof BdORMCrud;
        self.isMethodAllowed('duplicate', { throwErrorIfNotAllowed: true });
        if (!asDraft && this.isNew()) throw new BdORMError('Cannot duplicate an new instance');
        const data = { ...this.getData(true) };
        const primaryKey = this.getPrimaryKey();
        if (primaryKey in data) delete data[primaryKey];
        for (const key in data) {
            if (excludeColumns.includes(key) || self.PROPERTIES_NOT_ALLOWED_TO_DUPLICATE.includes(key)) {
                delete data[key];
                continue;
            }
            if (key in newData) data[key] = typeof newData[key] === 'function' ? newData[key](data[key]) : newData[key];
        }
        const newInstance = new self(data);
        if (!asDraft) await newInstance.save({ preventBeforeSave: true, preventAfterSave: true });
        return newInstance;
    }

    async save({
        beforeSaveParams = {},
        afterSaveParams = {},
        preventAfterSave = false,
        preventBeforeSave = false,
    } = {}): Promise<InstanceType<typeof BdORMCrud>> {
        (this.constructor as typeof BdORMCrud).isMethodAllowed('save', { throwErrorIfNotAllowed: true });
        await this.beforeSave(beforeSaveParams);
        if (this.isNew()) {
            await this._create({ preventBeforeCreate: preventBeforeSave, preventAfterCreate: preventAfterSave });
        } else {
            await this._update({ preventBeforeUpdate: preventBeforeSave, preventAfterUpdate: preventAfterSave });
        }
        if (!preventAfterSave) {
            await this.afterSave(afterSaveParams);
        }
        return this;
    }

    // STATICS

    static async count(where?: Record<string, any> | string, values?: any[]): Promise<number> {
        const result = await this._DbConnection.list(this.VIEW, {
            columns: 'COUNT(*) as count',
            filters: where,
            values,
        });
        return result[0].count;
    }

    static async create<T extends typeof BdORMCrud>(this: T, data: any): Promise<InstanceType<T>> {
        const instance = new this(data) as InstanceType<T>;
        await instance.save();
        return instance;
    }

    public static async fetch<T extends typeof BdORMCrud>(
        this: T,
        where?: Record<string, any> | string,
        values?: any[],
    ): Promise<InstanceType<T>[]> {
        const results = await this._DbConnection.list(this.VIEW, {
            columns: this.COLUMNS_TO_FETCH as string,
            filters: where,
            values,
        });
        return results.map((result: Record<string, any>) => new this(result) as InstanceType<T>);
    }

    public static async fetchById<T extends typeof BdORMCrud>(
        this: T,
        id: string | number,
    ): Promise<InstanceType<T> | undefined> {
        return this.fetchByPrimaryKey(id);
    }

    public static async fetchOne<T extends typeof BdORMCrud>(
        this: T,
        where: Record<string, any> | string,
        values?: any[],
    ): Promise<InstanceType<T> | undefined> {
        let limit;
        if (typeof where === 'string') where += ' LIMIT 1';
        else limit = 1;
        const results = await this._DbConnection.list(this.VIEW, {
            columns: this.COLUMNS_TO_FETCH as string,
            filters: where,
            limit,
            values,
        });
        return results?.length ? (new this(results[0]) as InstanceType<T>) : undefined;
    }

    public static async fetchByPrimaryKey<T extends typeof BdORMCrud>(
        this: T,
        primaryKeyValue: string | number,
    ): Promise<InstanceType<T> | undefined> {
        const primaryKey = await this._DbConnection.getTablePrimaryKey(this.TABLE);
        const result = await this._DbConnection.read(this.VIEW, primaryKeyValue, { primaryKey });
        if (!result)
            throw new BdORMError(`No entry found for ${this.VIEW} with ${this.PRIMARY_KEY} ${primaryKeyValue}`);
        return new this(result) as InstanceType<T>;
    }

    public static setDbConnection(dbConnection: InstanceType<typeof BdOrmDbConnection>) {
        if (this._DbConnection) throw new BdORMError('DbConnection already set');
        this._DbConnection = dbConnection;
    }
    public static clearDbConnection() {
        //@ts-ignore
        this._DbConnection = undefined;
    }
    public static getDbConnection() {
        return this._DbConnection;
    }
}
