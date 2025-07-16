import BdOrmDbConnectionCapSqlite from './dbConnections/BdOrmDbConnectionCapSqlite';
import BaseORMCrud from './_/BdORMCrud';
import BdOrmDbConnection from './_/BdOrmConnection';
import BdOrmDbConnectionCapHana from './dbConnections/BdOrmDbConnectionCapHana';
import BdOrmDbConnectionSQLBase from './dbConnections/BdOrmDbConnectionSQLBase';

export default class BdOrm extends BaseORMCrud {}
export { BdOrmDbConnection, BdOrmDbConnectionCapSqlite, BdOrmDbConnectionCapHana, BdOrmDbConnectionSQLBase };
