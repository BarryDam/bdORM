import BdOrmDbConnectionCapSqlite from '../dbConnections/BdOrmDbConnectionCapSqlite';
import { getDefinitions, getTableColumns, getTablePrimaryKey } from './BdOrmDbConnectionCapHana/utils';

describe('BdOrmDbConnectionCapHana', () => {
    let dbConnection: BdOrmDbConnectionCapSqlite;
    //beforeEach(() => {
    dbConnection = new BdOrmDbConnectionCapSqlite(__dirname + '/../test-assets/db');
    //});

    test('Get the table info', async () => {
        const db = await dbConnection.getDb();
        //console.log(getDefinitions());
        const pk = getTablePrimaryKey('bdorm_user');
        expect(pk).toBe('id');
        const columns = getTableColumns('bdorm_user');
        expect(columns).toEqual(['id', 'firstname', 'lastname', 'email', 'dateCreated', 'options', 'deleted']);
    });
});
