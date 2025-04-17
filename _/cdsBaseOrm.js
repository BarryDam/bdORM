"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BdORMBase_1 = __importDefault(require("./BdORMBase"));
const cds_1 = __importDefault(require("@sap/cds"));
/**
 * Base class for CDS ORM
 */
class cdsBaseOrm extends BdORMBase_1.default {
    /**
     * Get the CDS model for the current table
     * @returns the CDS model for the current table
     */
    static get CDS_MODEL() {
        const namespace = this.TABLE.split('_')[0].toLowerCase();
        return Object.values(cds_1.default.entities(namespace)).find((o) => 'name' in o && o.name.toUpperCase().replace(/\./g, '_') === this.TABLE);
    }
}
exports.default = cdsBaseOrm;
