"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployHdbViewFiles = exports.log = exports.findFiles = exports.fillTableFromCsv = exports.addCsvFilesFromDBFolder = void 0;
const BdORMError_1 = require("../../_/BdORMError");
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const log = (message) => {
    console.log(`[BdOrmDbConnectionCapSqlite] ${message}`);
}, fillTableFromCsv = async (db, table, csvFile) => {
    try {
        const rows = [];
        await new Promise((resolve, reject) => {
            fs_1.default.createReadStream(csvFile)
                .pipe((0, csv_parser_1.default)({ separator: ';' }))
                .on('data', (data) => rows.push(data))
                .on('end', () => resolve())
                .on('error', error => {
                reject(error);
            });
        });
        // empty db
        await db.run(`DELETE FROM ${table}`);
        for (const row of rows) {
            const columns = Object.keys(row), placeholders = columns.map(() => '?').join(',');
            await db.run(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, Object.values(row));
        }
        log(`Added ${rows.length} rows in ${table} from CSV file: ${csvFile}`);
    }
    catch (error) {
        throw new BdORMError_1.BdORMError(`Error while filling table from CSV: ${error.message}`);
    }
}, findFiles = async (currentPath, extname) => {
    let files = [];
    //@ts-ignore
    const entries = fs_1.default.readdirSync(currentPath, { withFileTypes: true });
    //@ts-ignore
    for (const entry of entries) {
        const entryPath = path_1.default.join(currentPath, entry.name);
        if (entry.isDirectory()) {
            const subfiles = await findFiles(entryPath, extname);
            files.push(...subfiles);
        }
        else if (entry.isFile() && path_1.default.extname(entry.name) === extname) {
            files.push(entryPath);
        }
    }
    return files;
}, addCsvFilesFromDBFolder = async (db, dbPath) => {
    var _a;
    try {
        const csvFiles = await findFiles(dbPath, '.csv');
        for (const csvFile of csvFiles) {
            await fillTableFromCsv(db, (_a = csvFile.split('/').pop()) === null || _a === void 0 ? void 0 : _a.replace('.csv', '').replace('-', '_'), csvFile);
        }
    }
    catch (error) {
        throw new BdORMError_1.BdORMError(`Error while adding CsvFilesFromDbFolder: ${error.message}`);
    }
}, deployHdbViewFiles = async (db, dbPath) => {
    const hdbViewFiles = await findFiles(dbPath, '.hdbview');
    for (const hdbViewFile of hdbViewFiles) {
        const hdbView = fs_1.default.readFileSync(hdbViewFile, 'utf8');
        const m = await db.run(`create ${hdbView}`);
        log(`Deployed HDB view from file: ${hdbViewFile}`);
    }
};
exports.log = log;
exports.fillTableFromCsv = fillTableFromCsv;
exports.findFiles = findFiles;
exports.addCsvFilesFromDBFolder = addCsvFilesFromDBFolder;
exports.deployHdbViewFiles = deployHdbViewFiles;
