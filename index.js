"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BdOrmDbConnection = void 0;
const BdORMCrud_1 = __importDefault(require("./_/BdORMCrud"));
const BdOrmConnection_1 = __importDefault(require("./_/BdOrmConnection"));
exports.BdOrmDbConnection = BdOrmConnection_1.default;
class BdOrm extends BdORMCrud_1.default {
}
exports.default = BdOrm;
