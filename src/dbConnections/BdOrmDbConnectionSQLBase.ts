/**
 * Use this class as a base class for all SQL database connections
 * It provides methods to interact with the database, such as create, read, update, delete, and list records.
 * It also provides methods to execute raw SQL queries and manage database connections.
 *
 * This class is not meant to be used directly, but rather as a base class for other database connection classes.
 * make sure yo u implement the _db method to return the correct database connection
 * and the getTableColumns and getTablePrimaryKey methods to return the correct table columns and primary key
 */
import { BdORMError } from '../_/BdORMError';
import BdOrmDbConnection from '../_/BdOrmConnection';

abstract class BdOrmDbConnectionSQLBase extends BdOrmDbConnection {
    protected async _db(): Promise<{ run: (query: string, values?: any[]) => Promise<any> }> {
        throw new BdORMError(`_db not implemented for ${this.constructor.name}`);
    }

    public async close() {
        throw new BdORMError(`close not implemented for ${this.constructor.name}`);
    }

    public async create(table: string, data: Record<string, any>) {
        const columns = Object.keys(data),
            placeholders = columns.map(() => '?').join(',');
        const { lastInsertRowid }: { changes: number; lastInsertRowid: number } = await this.query(
            `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`,
            columns.map(column => data[column]),
        );
        const pk = await this.getTablePrimaryKey(table);
        const result = await this.query(`SELECT * FROM ${table} WHERE ${pk} = ${lastInsertRowid}`);
        return result[0];
    }

    public async delete(table: string, primaryKeyValue: string | number) {
        const primaryKey = await this.getTablePrimaryKey(table);
        await this.query(`DELETE FROM ${table} WHERE ${primaryKey} = ?`, [primaryKeyValue]);
    }

    public async getTableColumns(table: string): Promise<string[]> {
        throw new BdORMError(`getTableColumns not implemented for ${this.constructor.name}`);
    }

    /**
     * Get the primary key of the table
     */
    public async getTablePrimaryKey(table: string): Promise<string> {
        throw new BdORMError(`getTablePrimaryKey not implemented for ${this.constructor.name}`);
    }

    public async list(
        table: string,
        {
            filters,
            columns = '*',
            orderBy,
            limit,
            offset,
            values = [],
        }: {
            columns?: string | string[];
            filters?: Record<string, any> | string;
            limit?: number;
            offset?: number;
            orderBy?: string;
            values?: any[];
        } = {},
    ) {
        let query = `SELECT ${columns} FROM ${table}`;
        if (typeof filters === 'string') {
            query += ` WHERE ${filters}`;
        } else {
            if (typeof filters === 'object' && Object.keys(filters).length > 0) {
                values = [];
                const whereClause = Object.keys(filters)
                    .map(key => `${key} = ?`)
                    .join(' AND ');
                query += ` WHERE ${whereClause}`;
                values.push(...Object.values(filters));
            }
            if (orderBy) query += ` ORDER BY ${orderBy}`;
            if (limit) query += ` LIMIT ${limit}`;
            if (offset) query += ` OFFSET ${offset}`;
        }
        return this.query(query, values);
    }

    public async query(query: string, escapedValues: any[] = []) {
        const db = await this._db();
        try {
            return await db.run(query, escapedValues);
        } catch (error) {
            throw new BdORMError(
                `Error executing db query: ${(error as Error)?.message}. \nQuery: ${query} \nValues: ${escapedValues}`,
            );
        }
    }
    /**
     * Alias for query
     */
    public async run(query: string, escapedValues: any[] = []) {
        return this.query(query, escapedValues);
    }

    public async read(table: string, primaryKeyValue: string | number, { primaryKey }: { primaryKey?: string } = {}) {
        const pk = primaryKey ?? (await this.getTablePrimaryKey(table));
        const result = await this.query(`SELECT * FROM ${table} WHERE ${pk} = ?`, [primaryKeyValue]);
        return result?.[0] || undefined;
    }

    public async update(table: string, data: any) {
        const setClause = Object.keys(data)
                .map(key => `${key} = ?`)
                .join(', '),
            primaryKey = await this.getTablePrimaryKey(table),
            primaryKeyValue = data[primaryKey];
        if (!primaryKeyValue)
            throw new BdORMError(`No primary key value found for table ${table}, data: ${JSON.stringify(data)}`);
        await this.query(`UPDATE ${table} SET ${setClause} WHERE ${primaryKey} = ?`, [
            ...Object.values(data),
            primaryKeyValue,
        ]);
    }
}
export default BdOrmDbConnectionSQLBase;
