"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTableColumns = exports.getTablePrimaryKey = exports.getTableDefinition = exports.getDefinitions = void 0;
const cds_1 = __importDefault(require("@sap/cds"));
const _definitionCache = {};
const getDefinitions = () => {
    var _a, _b, _c;
    if (Object.keys(_definitionCache).length)
        return _definitionCache;
    const cdsDefinitions = ((_c = (_b = (_a = cds_1.default === null || cds_1.default === void 0 ? void 0 : cds_1.default.model) === null || _a === void 0 ? void 0 : _a.definitions) !== null && _b !== void 0 ? _b : cds_1.default.entities) !== null && _c !== void 0 ? _c : {});
    if (Object.keys(cdsDefinitions).length === 0)
        return undefined;
    Object.entries(cdsDefinitions).forEach(([key, { elements, name }]) => {
        var _a, _b;
        _definitionCache[name.toLowerCase().replace(/\./g, '_')] = {
            primaryKey: (_b = (_a = Object.entries(elements).find(([_, { key }]) => key)) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : '',
            columnNames: Object.entries(elements).map(([column]) => column),
        };
    });
    return _definitionCache;
};
exports.getDefinitions = getDefinitions;
const getTableDefinition = (table) => {
    const definitions = getDefinitions();
    if (!definitions)
        return undefined;
    const tableDefinition = definitions[table.toLowerCase().replace(/\./g, '_')];
    if (!tableDefinition)
        return undefined;
    return tableDefinition;
};
exports.getTableDefinition = getTableDefinition;
const getTablePrimaryKey = (table) => {
    const tableDefinition = getTableDefinition(table);
    if (!tableDefinition)
        return undefined;
    return tableDefinition.primaryKey;
};
exports.getTablePrimaryKey = getTablePrimaryKey;
const getTableColumns = (table) => {
    const tableDefinition = getTableDefinition(table);
    if (!tableDefinition)
        return undefined;
    return tableDefinition.columnNames;
};
exports.getTableColumns = getTableColumns;
