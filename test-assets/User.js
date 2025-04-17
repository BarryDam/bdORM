"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = __importDefault(require(".."));
class User extends __1.default {
}
User.DB_TABLE = 'bdorm_user';
User.DB_VIEW = 'user_view';
User.PROPERTIES_NOT_ALLOWED_TO_CHANGE = ['dateCreated'];
User.PROPERTIES_NOT_ALLOWED_TO_DUPLICATE = ['dateCreated'];
exports.default = User;
