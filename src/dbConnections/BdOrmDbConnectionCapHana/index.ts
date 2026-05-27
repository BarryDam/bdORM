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

const remapResultColumns = (result: Record<string, any>, columns: string[]) => {
    return Object.entries(result).reduce(
        (resultMapped, [key, value]) => {
            const column = columns.find(column => column.toUpperCase() === key.toUpperCase());
            resultMapped[column ?? key] = value;
            return resultMapped;
        },
        {} as Record<string, any>,
    );
};

const getTableFromQuery = (query: string): string | undefined => {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    const tableMatcher =
        /\bFROM\s+([A-Za-z0-9_."$]+)/i.exec(normalizedQuery) ||
        /\bINTO\s+([A-Za-z0-9_."$]+)/i.exec(normalizedQuery) ||
        /\bUPDATE\s+([A-Za-z0-9_."$]+)/i.exec(normalizedQuery) ||
        /\bDELETE\s+FROM\s+([A-Za-z0-9_."$]+)/i.exec(normalizedQuery);
    const table = tableMatcher?.[1];
    if (!table) return undefined;
    return table.replace(/"/g, '').split('.').pop();
};

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
        const cdsColumns = getTableColumns(table);
        if (cdsColumns) return cdsColumns;
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

    /**
     * Custom overwrites for list and read > hana stores the db columns in uppercase, so we need to convert the columns to what is defined in the cds file
     */
    public async list(
        table: string,
        options: {
            columns?: string | string[];
            filters?: Record<string, any> | string;
            limit?: number;
            offset?: number;
            orderBy?: string;
            values?: any[];
        } = {},
    ) {
        const results = await super.list(table, options),
            columns = await this.getTableColumns(table);
        return results?.map((result: Record<string, any>) => remapResultColumns(result, columns));
    }
    public async read(table: string, primaryKeyValue: string | number, { primaryKey }: { primaryKey?: string } = {}) {
        const result = await super.read(table, primaryKeyValue, { primaryKey }),
            columns = await this.getTableColumns(table);
        return result ? remapResultColumns(result, columns) : result;
    }

    /**
     * Overwrite to add remapping of columns to the query results, because hana stores the db columns in uppercase, so we need to convert the columns to what is defined in the cds file
     */
    public async query(query: string, escapedValues: any[] = []) {
        const result = await super.query(query, escapedValues);
        const table = getTableFromQuery(query);
        const tableColumns = table ? await this.getTableColumns(table).catch(() => undefined) : undefined;
        if (Array.isArray(result)) {
            const columns = tableColumns ?? Object.keys(result[0] || {});
            return result.map((row: Record<string, any>) => remapResultColumns(row, columns));
        } else if (typeof result === 'object' && result !== null) {
            const columns = tableColumns ?? Object.keys(result);
            return remapResultColumns(result, columns);
        }
        return result;
    }
}
