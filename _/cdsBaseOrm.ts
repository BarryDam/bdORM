import BaseORM from './BdORMBase';
import cds from '@sap/cds';

/**
 * Base class for CDS ORM
 */
export default abstract class cdsBaseOrm extends BaseORM {
    /**
     * Get the CDS model for the current table
     * @returns the CDS model for the current table
     */
    static get CDS_MODEL(): cds.entity | undefined {
        const namespace = this.TABLE.split('_')[0].toLowerCase();
        return Object.values(cds.entities(namespace)).find(
            (o: any) => 'name' in o && o.name.toUpperCase().replace(/\./g, '_') === this.TABLE,
        );
    }
}
