"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = __importDefault(require(".."));
class Post extends __1.default {
    async fetchUser() {
        //TODO; //User.fetch
    }
}
Post.DB_TABLE = 'posts';
exports.default = Post;
