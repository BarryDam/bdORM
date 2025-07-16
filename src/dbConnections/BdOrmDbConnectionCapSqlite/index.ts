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
import { BdORMError } from '../../_/BdORMError';
import BdOrmDbConnectionSQLBase from '../BdOrmDbConnectionSQLBase';
import { addCsvFilesFromDBFolder, deployHdbViewFiles, fillTableFromCsv } from './utils';
import cds from '@sap/cds';

type TableInfo = { pk: number; name: string; type: string };

const PRIMARY_KEYS: Record<string, string> = {};
const TABLE_INFO: Record<string, TableInfo[]> = {};

export default class BdOrmDbConnectionCapSqlite extends BdOrmDbConnectionSQLBase {
    private readonly _csvFiles: string[] = [];
    private _deployed: boolean = false;
    private _dbPath: string = '';

    protected async _db() {
        let db;
        if (!this._deployed) {
            //@ts-ignore jest zegt cds.deploy does not exists
            await cds.deploy(this._dbPath).to('sqlite::memory:');
            db = await cds.connect.to('db');
            if (!this._csvFiles.length) await addCsvFilesFromDBFolder(db, this._dbPath);
            else {
                for (const csvFile of this._csvFiles) {
                    await fillTableFromCsv(
                        db,
                        csvFile.split('/').pop()?.replace('.csv', '').replace('-', '_') as string,
                        csvFile,
                    );
                }
            }
            await deployHdbViewFiles(db, this._dbPath);
            this._deployed = true;
        }
        return db ?? cds.connect.to('db');
    }

    public async getDb() {
        return this._db();
    }

    constructor(dbPath: string, options?: { csvFiles: string[] }) {
        super();
        this._csvFiles = options?.csvFiles || [];
        this._dbPath = dbPath;
    }

    public async getTableColumns(table: string) {
        if (TABLE_INFO[table]) return TABLE_INFO[table].map(info => info.name);
        const tableInfo: [TableInfo] = await this.query(`PRAGMA table_info(${table})`);
        TABLE_INFO[table] = tableInfo;
        return tableInfo.map(info => info.name);
    }

    /**
     * Get the primary key of the table
     */
    public async getTablePrimaryKey(table: string) {
        if (PRIMARY_KEYS[table]) return PRIMARY_KEYS[table];
        const tableInfo: [TableInfo] = await this.query(`PRAGMA table_info(${table})`);
        TABLE_INFO[table] = tableInfo;
        const primaryKey = tableInfo.find(info => info.pk === 1)?.name;
        if (!primaryKey) throw new BdORMError(`No primary key found for table ${table}`);
        PRIMARY_KEYS[table] = primaryKey;
        return primaryKey;
    }

    /**
     * Fills the database with data from the CSV files provided in the constructor
     * note the table will be emptied before filling it with the data from the CSV file
     */
    public async fillTableFromCsvFile(table: string, csvFile: string) {
        const db = await this._db();
        await fillTableFromCsv(db, table, csvFile);
    }
}
