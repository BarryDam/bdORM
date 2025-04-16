import { BdORMError } from '../../_/BdORMError';
import cds from '@sap/cds';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

const log = (message: string) => {
        console.log(`[BdOrmDbConnectionCapSqlite] ${message}`);
    },
    fillTableFromCsv = async (db: cds.DatabaseService, table: string, csvFile: string) => {
        try {
            const rows: Record<string, any>[] = [];
            await new Promise<void>((resolve, reject) => {
                fs.createReadStream(csvFile)
                    .pipe(csv({ separator: ';' }))
                    .on('data', (data: Record<string, any>) => rows.push(data))
                    .on('end', () => resolve())
                    .on('error', error => {
                        reject(error);
                    });
            });
            // empty db
            await db.run(`DELETE FROM ${table}`);
            for (const row of rows) {
                const columns = Object.keys(row),
                    placeholders = columns.map(() => '?').join(',');
                await db.run(
                    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
                    Object.values(row),
                );
            }
            log(`Added ${rows.length} rows in ${table} from CSV file: ${csvFile}`);
        } catch (error) {
            throw new BdORMError(`Error while filling table from CSV: ${(error as Error).message}`);
        }
    },
    findFiles = async (currentPath: string, extname: string) => {
        let files: string[] = [];
        //@ts-ignore
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        //@ts-ignore
        for (const entry of entries) {
            const entryPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                const subfiles = await findFiles(entryPath, extname);
                files.push(...subfiles);
            } else if (entry.isFile() && path.extname(entry.name) === extname) {
                files.push(entryPath);
            }
        }
        return files;
    },
    addCsvFilesFromDBFolder = async (db: cds.DatabaseService, dbPath: string) => {
        try {
            const csvFiles = await findFiles(dbPath, '.csv');
            for (const csvFile of csvFiles) {
                await fillTableFromCsv(
                    db,
                    csvFile.split('/').pop()?.replace('.csv', '').replace('-', '_') as string,
                    csvFile,
                );
            }
        } catch (error) {
            throw new BdORMError(`Error while adding CsvFilesFromDbFolder: ${(error as Error).message}`);
        }
    },
    deployHdbViewFiles = async (db: cds.DatabaseService, dbPath: string) => {
        const hdbViewFiles = await findFiles(dbPath, '.hdbview');
        for (const hdbViewFile of hdbViewFiles) {
            const hdbView = fs.readFileSync(hdbViewFile, 'utf8');
            const m = await db.run(`create ${hdbView}`);
            log(`Deployed HDB view from file: ${hdbViewFile}`);
        }
    };
export { addCsvFilesFromDBFolder, fillTableFromCsv, findFiles, log, deployHdbViewFiles };
