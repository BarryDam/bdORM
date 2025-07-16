import BdOrm from '..';

interface User {
    id: number;
    firstname: string;
    lastname: string;
    fullname?: string; // view property
    email: string;
    dateCreated: string;
}
class User extends BdOrm {
    static readonly DB_TABLE = 'bdorm_user';
    static readonly DB_VIEW = 'user_view';
    static readonly PROPERTIES_NOT_ALLOWED_TO_CHANGE = ['dateCreated'];
    static readonly PROPERTIES_NOT_ALLOWED_TO_DUPLICATE = ['dateCreated'];
}

export default User;
