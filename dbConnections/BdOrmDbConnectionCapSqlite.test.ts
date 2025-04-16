import BdOrmDbConnectionCapSqlite from './BdOrmDbConnectionCapSqlite';

describe('bd-orm baseORMCrud', () => {
    const dbConnection = new BdOrmDbConnectionCapSqlite(__dirname + '/../test-assets/db');
    it('check if csv import has worked and if read works', async () => {
        const { firstname } = await dbConnection.read('BDORM_USER', 2);
        expect(firstname).toBe('Barry');
    });
    it('create worked', async () => {
        const user = await dbConnection.create('BDORM_USER', { firstname: 'John', lastname: 'Wayne' });
        expect(user.firstname).toBe('John');
        expect(user.lastname).toBe('Wayne');
        expect(user.id).toBe(3);
    });

    it('update worked', async () => {
        await dbConnection.update('BDORM_USER', { id: 1, firstname: 'Boomer' });
        const { firstname } = await dbConnection.read('BDORM_USER', 1);
        expect(firstname).toBe('Boomer');
    });

    it('delete worked', async () => {
        const users = await dbConnection.list('BDORM_USER');
        await dbConnection.delete('BDORM_USER', 1);
        const deleted = await dbConnection.read('BDORM_USER', 1);
        const usersAfterDelete = await dbConnection.list('BDORM_USER');
        expect(deleted).toBeUndefined();
        expect(usersAfterDelete).toHaveLength(users.length - 1);
    });

    it('query worked', async () => {
        const users = await dbConnection.query('SELECT * FROM BDORM_USER WHERE id = 2');
        expect(users[0].firstname).toBe('Barry');
    });

    it('query a view worked', async () => {
        const user = await dbConnection.create('BDORM_USER', { firstname: 'Test', lastname: 'Persoon' });
        const users = await dbConnection.query('SELECT * FROM USER_VIEW WHERE lastname = ?', ['Persoon']);
        expect(users[0].fullname).toBe('Test Persoon');
    });
});
