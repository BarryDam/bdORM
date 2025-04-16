export default abstract class BdOrmDbConnection {
    /**
     * Create a new entry in the table
     * @param table The table to create the entry in
     * @param data The data to create the entry with
     * @param params Additional parameters
     * @returns The created entry
     */
    public abstract create(
        table: string,
        data: Record<string, any>,
        params?: { primaryKey: string },
    ): Promise<Record<string, any>>;
    public abstract read(
        table: string,
        primaryKeyValue: string | number,
        params?: { primaryKey: string },
    ): Promise<Record<string, any> | undefined>;
    public abstract update(table: string, data: any, params?: { primaryKey: string }): Promise<void>;
    public abstract delete(
        table: string,
        primaryKeyValue: string | number,
        params?: { primaryKey: string },
    ): Promise<void>;
    public abstract list(
        table: string,
        params?: {
            columns?: string | string[];
            filters?: Record<string, any> | string;
            limit?: number;
            offset?: number;
            orderBy?: string;
            values?: any[];
        },
    ): Promise<Record<string, any>[]>;
    public abstract query(query: string, escapedValues?: any[]): Promise<Record<string, any>[]>;
    public abstract getTablePrimaryKey(table: string): Promise<string>;
    public abstract getTableColumns(table: string): Promise<string[]>;
}
