"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Use this connection when your project is using SAP CAP and running a SAP HANA DB
 * This class extends the BdOrmDbConnectionSQLBase and provides methods to interact with a SQLite database
 * Need to work with unit tests? use the BdOrmDbConnectionCapSqlite class
 */
const BdORMError_1 = require("../../_/BdORMError");
const BdOrmDbConnectionSQLBase_1 = __importDefault(require("../BdOrmDbConnectionSQLBase"));
const utils_1 = require("./utils");
const cds_1 = __importDefault(require("@sap/cds"));
const PRIMARY_KEYS = {};
const TABLE_COLUMNS = {};
class BdOrmDbConnectionCapHana extends BdOrmDbConnectionSQLBase_1.default {
    async _db() {
        return cds_1.default.db ? cds_1.default.db : await cds_1.default.connect.to('db');
    }
    async close() {
        const db = await this._db();
        //@ts-ignore jest zegt cds.disconnect does not exists
        await db.disconnect();
    }
    async getTableColumns(table) {
        const columns = (0, utils_1.getTableColumns)(table);
        if (columns)
            return columns;
        if (TABLE_COLUMNS[table])
            return TABLE_COLUMNS[table];
        const tableInfo = await this.query(`SELECT COLUMN_NAME FROM TABLE_COLUMNS WHERE TABLE_NAME = '${table}'`);
        if (tableInfo.length === 0)
            throw new BdORMError_1.BdORMError(`No columns found for table ${table}`);
        TABLE_COLUMNS[table] = tableInfo.map(info => info.COLUMN_NAME);
        return TABLE_COLUMNS[table];
    }
    /**
     * Get the primary key of the table
     */
    async getTablePrimaryKey(table) {
        var _a;
        const primaryKey = (0, utils_1.getTablePrimaryKey)(table);
        if (primaryKey)
            return primaryKey;
        if (PRIMARY_KEYS[table])
            return PRIMARY_KEYS[table];
        const tableInfo = await this.query(`SELECT COLUMN_NAME FROM SYS.INDEX_COLUMNS WHERE TABLE_NAME = '${table}' AND CONSTRAINT = 'PRIMARY KEY'`);
        PRIMARY_KEYS[table] = (_a = tableInfo[0]) === null || _a === void 0 ? void 0 : _a.COLUMN_NAME;
        if (!PRIMARY_KEYS[table])
            throw new BdORMError_1.BdORMError(`No primary key found for table ${table}`);
        return PRIMARY_KEYS[table];
    }
}
exports.default = BdOrmDbConnectionCapHana;
