"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Use this connection class when writing unit tests
 *
 * This class extends the BdOrmDbConnection and provides methods to interact with a SQLite in-memory database
 * for unit testing purposes. It includes functionality to create, read, update, delete, and list records
 * in the database, as well as to execute arbitrary queries.
 *
 * The class maintains a record of deployed databases and primary keys for tables to optimize database
 * operations. It uses the SAP CDS framework for database connectivity and operations.
 *
 * it automatically fills the database with data from the CSV files that are found in the provided database folder
 * or from the CSV files provided in the constructor
 */
const BdORMError_1 = require("../../_/BdORMError");
const BdOrmDbConnectionSQLBase_1 = __importDefault(require("../BdOrmDbConnectionSQLBase"));
const utils_1 = require("./utils");
const cds_1 = __importDefault(require("@sap/cds"));
const PRIMARY_KEYS = {};
const TABLE_INFO = {};
class BdOrmDbConnectionCapSqlite extends BdOrmDbConnectionSQLBase_1.default {
    async _db() {
        var _a;
        let db;
        if (!this._deployed) {
            //@ts-ignore jest zegt cds.deploy does not exists
            await cds_1.default.deploy(this._dbPath).to('sqlite::memory:');
            db = await cds_1.default.connect.to('db');
            if (!this._csvFiles.length)
                await (0, utils_1.addCsvFilesFromDBFolder)(db, this._dbPath);
            else {
                for (const csvFile of this._csvFiles) {
                    await (0, utils_1.fillTableFromCsv)(db, (_a = csvFile.split('/').pop()) === null || _a === void 0 ? void 0 : _a.replace('.csv', '').replace('-', '_'), csvFile);
                }
            }
            await (0, utils_1.deployHdbViewFiles)(db, this._dbPath);
            this._deployed = true;
        }
        return db !== null && db !== void 0 ? db : cds_1.default.connect.to('db');
    }
    async getDb() {
        return this._db();
    }
    constructor(dbPath, options) {
        super();
        this._csvFiles = [];
        this._deployed = false;
        this._dbPath = '';
        this._csvFiles = (options === null || options === void 0 ? void 0 : options.csvFiles) || [];
        this._dbPath = dbPath;
    }
    async getTableColumns(table) {
        if (TABLE_INFO[table])
            return TABLE_INFO[table].map(info => info.name);
        const tableInfo = await this.query(`PRAGMA table_info(${table})`);
        TABLE_INFO[table] = tableInfo;
        return tableInfo.map(info => info.name);
    }
    /**
     * Get the primary key of the table
     */
    async getTablePrimaryKey(table) {
        var _a;
        if (PRIMARY_KEYS[table])
            return PRIMARY_KEYS[table];
        const tableInfo = await this.query(`PRAGMA table_info(${table})`);
        TABLE_INFO[table] = tableInfo;
        const primaryKey = (_a = tableInfo.find(info => info.pk === 1)) === null || _a === void 0 ? void 0 : _a.name;
        if (!primaryKey)
            throw new BdORMError_1.BdORMError(`No primary key found for table ${table}`);
        PRIMARY_KEYS[table] = primaryKey;
        return primaryKey;
    }
    /**
     * Fills the database with data from the CSV files provided in the constructor
     * note the table will be emptied before filling it with the data from the CSV file
     */
    async fillTableFromCsvFile(table, csvFile) {
        const db = await this._db();
        await (0, utils_1.fillTableFromCsv)(db, table, csvFile);
    }
}
exports.default = BdOrmDbConnectionCapSqlite;
