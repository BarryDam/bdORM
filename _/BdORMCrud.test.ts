import BdOrmDbConnectionCapSqlite from '../dbConnections/BdOrmDbConnectionCapSqlite';
import BdOrm from '../index';
import User from '../test-assets/User';
import { expectErrorMessage } from '../test-assets/jestUtils';
import cds from '@sap/cds';

describe('bd-orm BdORMCrud', () => {
    let dbConnection: BdOrmDbConnectionCapSqlite;
    //beforeEach(() => {
    BdOrm.clearDbConnection();
    dbConnection = new BdOrmDbConnectionCapSqlite(__dirname + '/../test-assets/db');
    BdOrm.setDbConnection(dbConnection);
    //});

    it('Prevent setting the db connection twice', () => {
        expectErrorMessage(async () => BdOrm.setDbConnection(dbConnection), 'DbConnection already set');
    });

    it("Count the number of users in the database, it's 2", async () => {
        const count = await User.count();
        expect(count).toBe(2);
    });

    it('Create a user ', async () => {
        const user = new User({ firstname: 'Test', lastname: 'Persoon' });
        await user.save();
        expect(user.id).toBe(3);
        const results = await dbConnection.query('SELECT * FROM bdorm_user WHERE id = 3');
        expect(results[0].firstname).toBe('Test');
        expect(results[0].lastname).toBe('Persoon');
        // alternate creation method
        const user2 = await User.create({ firstname: 'Test2', lastname: 'Persoon2' });
        expect(user2.id).toBe(4);
        const results2 = await dbConnection.query('SELECT * FROM bdorm_user WHERE id = 4');
        expect(results2[0].firstname).toBe('Test2');
        expect(results2[0].lastname).toBe('Persoon2');
    });

    it('Create a user with properties that are not in the table', async () => {
        const user = new User({ firstname: 'Invalid', lastname: 'Property', invalidprop: 'sadf' });
        await user.save();
        const results = await dbConnection.query('SELECT * FROM bdorm_user WHERE id = ?', [user.id]);
        expect(results[0].firstname).toBe('Invalid');
        expect(results[0].lastname).toBe('Property');
    });

    it('Delete a user', async () => {
        // first add a user
        const user = await User.create({ firstname: 'Delete', lastname: 'Me' });
        const id = user.id;
        const results = await dbConnection.query('SELECT * FROM bdorm_user WHERE id = ?', [id]);
        expect(results).toHaveLength(1);
        // then delete the user
        await user.delete();
        const resultsAfterDelete = await dbConnection.query('SELECT * FROM bdorm_user WHERE id = ?', [id]);
        expect(resultsAfterDelete).toHaveLength(0);
        const resultsAfterDelete2 = await dbConnection.query('SELECT * FROM bdorm_user WHERE firstname = ?', [
            'Delete',
        ]);
        expect(resultsAfterDelete2).toHaveLength(0);
    });

    it('Fetch a user by id', async () => {
        const user = await User.fetchByPrimaryKey(1);
        expect(user).toBeInstanceOf(User);
        expect(user?.firstname).toBe('John');
        expect(user?.lastname).toBe('Doe');

        const user2 = await User.fetchById(2);
        expect(user2).toBeInstanceOf(User);
        expect(user2?.firstname).toBe('Barry');
        expect(user2?.lastname).toBe('Dam');
    });

    it('Fetch multiple users', async () => {
        const users = await User.fetch();
        expect(users[0]).toBeInstanceOf(User);
        expect(users[1]).toBeInstanceOf(User);
        expect(users[0].firstname).toBe('John');
        expect(users[1].firstname).toBe('Barry');
    });

    it('Fetch with a where clause as object', async () => {
        const users = await User.fetch({ firstname: 'John' });
        expect(users).toHaveLength(1);
        expect(users[0].firstname).toBe('John');
        expect(users[0].lastname).toBe('Doe');
    });

    it('Fetch with a where clause as string', async () => {
        const users = await User.fetch('firstname = ?', ['Barry']);
        expect(users).toHaveLength(1);
        expect(users[0].firstname).toBe('Barry');
        expect(users[0].lastname).toBe('Dam');
    });

    it("Fetch where clause that doesn't match", async () => {
        const user = await User.fetch({ firstname: 'Barry', lastname: 'Doe' });
        expect(user.length).toBe(0);
    });

    it('Fetch One', async () => {
        const user = await User.fetchOne({ firstname: 'Barry' });
        expect(user).toBeInstanceOf(User);
        expect(user?.firstname).toBe('Barry');
        expect(user?.lastname).toBe('Dam');
    });

    it('Update a user', async () => {
        const user = await User.fetchById(1);
        expect(user).toBeInstanceOf(User);
        if (!user) throw new Error('User not found');
        const firstname = user.firstname;
        user.firstname = 'Jane';
        await user.save();
        const results = await dbConnection.query('SELECT * FROM bdorm_user WHERE id = 1');
        expect(results[0].firstname).toBe('Jane');
        user.firstname = firstname;
        await user.save();
        const results2 = await dbConnection.query('SELECT * FROM bdorm_user WHERE id = 1');
        expect(results2[0].firstname).toBe('John');
    });

    it('Should save JSON options as a string in the db', async () => {
        const user = new User({ firstname: 'Json', lastname: 'Persoon', options: { test: 'test 123' } });
        await user.save();
        const results = await dbConnection.query('SELECT * FROM bdorm_user WHERE firstname = ?', ['Json']);
        expect(results[0].options).toBe('{"test":"test 123"}');
        const userJSON = await User.fetchOne({ firstname: 'Json' });
        expect(userJSON?.options).toEqual({ test: 'test 123' });
        expect(userJSON?.options?.test).toEqual('test 123');
    });

    it('Should not allow me to run delete and save', async () => {
        class userNotAllowedDeleteAndSave extends User {
            static readonly METHODS_NOT_ALLOWED = ['save', 'delete'];
        }
        const user = new userNotAllowedDeleteAndSave({ firstname: 'Json', lastname: 'Persoon' });
        expectErrorMessage(async () => {
            await user.save();
        }, 'Method "save" not allowed');
        expectErrorMessage(async () => {
            await user.delete();
        }, 'Method "delete" not allowed');
    });

    it('Columns to fetch is altered and works correctly', async () => {
        class UserWithColumnsToFetch extends User {
            static readonly COLUMNS_TO_FETCH = ['id', 'firstname'];
        }
        const users = await UserWithColumnsToFetch.fetch();
        expect(users[0]).toBeInstanceOf(UserWithColumnsToFetch);
        expect(users[0].firstname).toBe('John');
        expect(users[0].lastname).toBeUndefined();
        class UserWithColumnsToFetch2 extends User {
            static readonly COLUMNS_TO_FETCH = 'id, firstname, lastname as achternaam';
        }
        const user = await UserWithColumnsToFetch2.fetchOne('firstname = ? and lastname = ?', ['John', 'Doe']);
        expect(user).toBeInstanceOf(UserWithColumnsToFetch2);
        expect(user?.firstname).toBe('John');
        expect(user?.lastname).toBeUndefined();
        expect(user?.achternaam).toBe('Doe');
        expect(user?.fullname).toBeUndefined();
    });

    describe('Duplicate tests', () => {
        it('Should duplicate the user as draft and remove dateCreated', async () => {
            const user = await User.fetchById(1); // John Doe
            const user2 = await user?.duplicate({ asDraft: true });
            expect(user2).toBeInstanceOf(User);
            expect(user2?.firstname).toBe('John');
            expect(user2?.lastname).toBe('Doe');
            expect(user2?.isNew()).toBe(true);
            expect(user2?.dateCreated).toBeUndefined();
        });
        it('Should duplicate the user as draft and set the firstname to Johnny', async () => {
            const user = await User.fetchById(1); // John Doe
            const user2 = await user?.duplicate({ asDraft: true, newData: { firstname: 'Johnny' } });
            expect(user2).toBeInstanceOf(User);
            expect(user2?.firstname).toBe('Johnny');
            expect(user2?.lastname).toBe('Doe');
            expect(user2?.isNew()).toBe(true);
        });
        it('Should duplicate the user and save it to the DB', async () => {
            const user = await User.fetchById(1); // John Doe
            const user2 = await user?.duplicate();
            expect(user2).toBeInstanceOf(User);
            expect(user2?.firstname).toBe('John');
            expect(user2?.lastname).toBe('Doe');
            expect(user2?.isNew()).toBe(false);
            expect(user2?.dateCreated).not.toBeUndefined();
            const results = await dbConnection.query('SELECT * FROM bdorm_user WHERE id = ?', [user2?.id]);
            expect(results[0].firstname).toBe('John');
            expect(results[0].lastname).toBe('Doe');
            expect(results[0].id).toBe(user2?.id);
        });
    });
});
