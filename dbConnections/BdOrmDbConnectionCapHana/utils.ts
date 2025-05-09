import cds from '@sap/cds';

type CdsElements = {
    [column: string]: { key?: boolean };
};
type Definitions = { [table: string]: { primaryKey: string; columnNames: string[] } };

const _definitionCache: Definitions = {} as Definitions;

const getDefinitions = () => {
    if (Object.keys(_definitionCache).length) return _definitionCache;
    const cdsDefinitions = (cds?.model?.definitions ?? cds.entities ?? {}) as unknown as {
        [table: string]: {
            name: string;
            elements: CdsElements;
        };
    };
    if (Object.keys(cdsDefinitions).length === 0) return undefined;
    Object.entries(cdsDefinitions).forEach(([key, { elements, name }]) => {
        if (elements === undefined) return;
        (_definitionCache as unknown as Definitions)[name.toLowerCase().replace(/\./g, '_') as unknown as string] = {
            primaryKey: Object.entries(elements).find(([_, { key }]) => key)?.[0] ?? '',
            columnNames: Object.entries(elements).map(([column]) => column),
        };
    });
    return _definitionCache;
};

const getTableDefinition = (table: string) => {
    const definitions = getDefinitions();
    if (!definitions) return undefined;
    const tableDefinition = definitions[table.toLowerCase().replace(/\./g, '_')];
    if (!tableDefinition) return undefined;
    return tableDefinition;
};
const getTablePrimaryKey = (table: string) => {
    const tableDefinition = getTableDefinition(table);
    if (!tableDefinition) return undefined;
    return tableDefinition.primaryKey;
};
const getTableColumns = (table: string) => {
    const tableDefinition = getTableDefinition(table);
    if (!tableDefinition) return undefined;
    return tableDefinition.columnNames;
};

export { getDefinitions, getTableDefinition, getTablePrimaryKey, getTableColumns };
