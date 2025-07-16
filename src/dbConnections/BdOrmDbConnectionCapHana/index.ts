/**
 * Use this connection when your project is using SAP CAP and running a SAP HANA DB
 * This class extends the BdOrmDbConnectionSQLBase and provides methods to interact with a SQLite database
 * Need to work with unit tests? use the BdOrmDbConnectionCapSqlite class
 */
import { BdORMError } from '../../_/BdORMError';
import BdOrmDbConnectionSQLBase from '../BdOrmDbConnectionSQLBase';
import { getTableColumns, getTablePrimaryKey } from './utils';
import cds from '@sap/cds';

const PRIMARY_KEYS: Record<string, string> = {};
const TABLE_COLUMNS: Record<string, string[]> = {};

export default class BdOrmDbConnectionCapHana extends BdOrmDbConnectionSQLBase {
    protected async _db() {
        return cds.db ? cds.db : await cds.connect.to('db');
    }

    public async close() {
        const db = await this._db();
        //@ts-ignore jest zegt cds.disconnect does not exists
        await db.disconnect();
    }

    public async getTableColumns(table: string): Promise<string[]> {
        const columns = getTableColumns(table);
        if (columns) return columns;
        if (TABLE_COLUMNS[table]) return TABLE_COLUMNS[table];
        const tableInfo: { COLUMN_NAME: string }[] = await this.query(
            `SELECT COLUMN_NAME FROM TABLE_COLUMNS WHERE TABLE_NAME = '${table}'`,
        );
        if (tableInfo.length === 0) throw new BdORMError(`No columns found for table ${table}`);
        TABLE_COLUMNS[table] = tableInfo.map(info => info.COLUMN_NAME);
        return TABLE_COLUMNS[table];
    }

    /**
     * Get the primary key of the table
     */
    public async getTablePrimaryKey(table: string): Promise<string> {
        const primaryKey = getTablePrimaryKey(table);
        if (primaryKey) return primaryKey;
        if (PRIMARY_KEYS[table]) return PRIMARY_KEYS[table];
        const tableInfo: [{ COLUMN_NAME: string }] = await this.query(
            `SELECT COLUMN_NAME FROM SYS.INDEX_COLUMNS WHERE TABLE_NAME = '${table}' AND CONSTRAINT = 'PRIMARY KEY'`,
        );
        PRIMARY_KEYS[table] = tableInfo[0]?.COLUMN_NAME;
        if (!PRIMARY_KEYS[table]) throw new BdORMError(`No primary key found for table ${table}`);
        return PRIMARY_KEYS[table];
    }


    public async create(table: string, data: Record<string, any>) {
        const columns = Object.keys(data),
            placeholders = columns.map(() => '?').join(','),
            pk = await this.getTablePrimaryKey(table);
        await this.query(
            `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`,
            columns.map(column => data[column]),
        );
        const result = await this.query(`SELECT * FROM ${table} ORDER BY ${pk} DESC LIMIT 1`);
        return result[0];
    }
}
