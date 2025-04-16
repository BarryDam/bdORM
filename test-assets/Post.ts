import BdOrm from '..';

interface Post {
    id: number;
    title: string;
    content: string;
    userId: number;
}
class Post extends BdOrm {
    static readonly DB_TABLE: string = 'posts';
    async fetchUser() {
        //TODO; //User.fetch
    }
}

export default Post;
