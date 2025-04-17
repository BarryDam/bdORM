"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Use this class as a base class for all SQL database connections
 * It provides methods to interact with the database, such as create, read, update, delete, and list records.
 * It also provides methods to execute raw SQL queries and manage database connections.
 *
 * This class is not meant to be used directly, but rather as a base class for other database connection classes.
 * make sure yo u implement the _db method to return the correct database connection
 * and the getTableColumns and getTablePrimaryKey methods to return the correct table columns and primary key
 */
const BdORMError_1 = require("../_/BdORMError");
const BdOrmConnection_1 = __importDefault(require("../_/BdOrmConnection"));
class BdOrmDbConnectionSQLBase extends BdOrmConnection_1.default {
    async _db() {
        throw new BdORMError_1.BdORMError(`_db not implemented for ${this.constructor.name}`);
    }
    async close() {
        throw new BdORMError_1.BdORMError(`close not implemented for ${this.constructor.name}`);
    }
    async create(table, data) {
        const columns = Object.keys(data), placeholders = columns.map(() => '?').join(',');
        const { lastInsertRowid } = await this.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`, columns.map(column => data[column]));
        const pk = await this.getTablePrimaryKey(table);
        const result = await this.query(`SELECT * FROM ${table} WHERE ${pk} = ${lastInsertRowid}`);
        return result[0];
    }
    async delete(table, primaryKeyValue) {
        const primaryKey = await this.getTablePrimaryKey(table);
        await this.query(`DELETE FROM ${table} WHERE ${primaryKey} = ?`, [primaryKeyValue]);
    }
    async getTableColumns(table) {
        throw new BdORMError_1.BdORMError(`getTableColumns not implemented for ${this.constructor.name}`);
    }
    /**
     * Get the primary key of the table
     */
    async getTablePrimaryKey(table) {
        throw new BdORMError_1.BdORMError(`getTablePrimaryKey not implemented for ${this.constructor.name}`);
    }
    async list(table, { filters, columns = '*', orderBy, limit, offset, values = [], } = {}) {
        let query = `SELECT ${columns} FROM ${table}`;
        if (typeof filters === 'string') {
            query += ` WHERE ${filters}`;
        }
        else {
            if (typeof filters === 'object' && Object.keys(filters).length > 0) {
                values = [];
                const whereClause = Object.keys(filters)
                    .map(key => `${key} = ?`)
                    .join(' AND ');
                query += ` WHERE ${whereClause}`;
                values.push(...Object.values(filters));
            }
            if (orderBy)
                query += ` ORDER BY ${orderBy}`;
            if (limit)
                query += ` LIMIT ${limit}`;
            if (offset)
                query += ` OFFSET ${offset}`;
        }
        return this.query(query, values);
    }
    async query(query, escapedValues = []) {
        const db = await this._db();
        try {
            return await db.run(query, escapedValues);
        }
        catch (error) {
            throw new BdORMError_1.BdORMError(`Error executing db query: ${error === null || error === void 0 ? void 0 : error.message}. \nQuery: ${query} \nValues: ${escapedValues}`);
        }
    }
    /**
     * Alias for query
     */
    async run(query, escapedValues = []) {
        return this.query(query, escapedValues);
    }
    async read(table, primaryKeyValue, { primaryKey } = {}) {
        const pk = primaryKey !== null && primaryKey !== void 0 ? primaryKey : (await this.getTablePrimaryKey(table));
        const result = await this.query(`SELECT * FROM ${table} WHERE ${pk} = ?`, [primaryKeyValue]);
        return (result === null || result === void 0 ? void 0 : result[0]) || undefined;
    }
    async update(table, data) {
        const setClause = Object.keys(data)
            .map(key => `${key} = ?`)
            .join(', '), primaryKey = await this.getTablePrimaryKey(table), primaryKeyValue = data[primaryKey];
        if (!primaryKeyValue)
            throw new BdORMError_1.BdORMError(`No primary key value found for table ${table}, data: ${JSON.stringify(data)}`);
        await this.query(`UPDATE ${table} SET ${setClause} WHERE ${primaryKey} = ?`, [
            ...Object.values(data),
            primaryKeyValue,
        ]);
    }
}
exports.default = BdOrmDbConnectionSQLBase;
