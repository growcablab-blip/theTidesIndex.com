import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { is, Table } from 'drizzle-orm';
import { toSnakeCase } from 'drizzle-orm/casing';
import * as schema from '@db/schema';
import { closeTestDb, createTestDb, query, type TestDb } from '../support/test-db';

/**
 * The versioned SQL under db/migrations is the authoritative database contract.
 * The Drizzle schema is the typed application view of it.
 *
 * Two descriptions of one database drift silently: someone edits a table
 * definition, forgets to generate, and the types then describe a database that
 * does not exist. This suite makes that impossible to miss. It applies the
 * migrations as shipped, introspects the result, and requires the ORM's view to
 * match it exactly — every table, every column, every nullability.
 *
 * If this fails, the migrations are right and the schema file is wrong, or a
 * generate step was skipped. Fix by running `npm run db:generate`; never by
 * relaxing the assertion.
 */
describe('schema and migrations describe the same database', () => {
  let db: TestDb;

  interface DbColumn {
    table_name: string;
    column_name: string;
    is_nullable: 'YES' | 'NO';
    is_generated: 'ALWAYS' | 'NEVER';
  }

  let actualColumns: DbColumn[];

  beforeAll(async () => {
    db = await createTestDb();
    actualColumns = await query<DbColumn>(
      db,
      `select table_name, column_name, is_nullable, is_generated
       from information_schema.columns
       where table_schema = 'public'
         and table_name in (
           select table_name from information_schema.tables
           where table_schema = 'public' and table_type = 'BASE TABLE'
         )`,
    );
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  /** Every table the Drizzle schema declares, ignoring enums and helpers. */
  function declaredTables(): PgTable[] {
    const tables: PgTable[] = [];
    for (const value of Object.values(schema)) {
      if (is(value, Table)) tables.push(value);
    }
    return tables;
  }

  it('declares at least the whole evidence model', () => {
    expect(declaredTables().length).toBeGreaterThanOrEqual(27);
  });

  it('has a real table behind every table the schema declares', () => {
    const actual = new Set(actualColumns.map((c) => c.table_name));
    const missing = declaredTables()
      .map((table) => getTableConfig(table).name)
      .filter((name) => !actual.has(name));

    expect(missing, 'tables declared in db/schema but absent from the migrations').toEqual([]);
  });

  it('has a schema definition for every table the migrations create', () => {
    const declared = new Set(declaredTables().map((table) => getTableConfig(table).name));
    const extra = [...new Set(actualColumns.map((c) => c.table_name))]
      .filter((name) => !declared.has(name))
      // drizzle's own bookkeeping table lives outside the application schema.
      .filter((name) => name !== '__drizzle_migrations');

    expect(extra, 'tables created by the migrations with no schema definition').toEqual([]);
  });

  it('matches column-for-column, including nullability and generation', () => {
    const actualByTable = new Map<string, Map<string, DbColumn>>();
    for (const column of actualColumns) {
      let table = actualByTable.get(column.table_name);
      if (!table) {
        table = new Map();
        actualByTable.set(column.table_name, table);
      }
      table.set(column.column_name, column);
    }

    const problems: string[] = [];

    for (const table of declaredTables()) {
      const config = getTableConfig(table);
      const actual = actualByTable.get(config.name);
      if (!actual) continue; // reported by the previous test

      for (const column of config.columns) {
        // Column names are snake_cased by the driver's casing option rather
        // than written out in the schema, so apply the same transform here.
        const columnName = toSnakeCase(column.name);
        const found = actual.get(columnName);
        if (!found) {
          problems.push(`${config.name}.${columnName}: declared but not in the database`);
          continue;
        }

        const declaredNullable = !column.notNull;
        const actualNullable = found.is_nullable === 'YES';
        if (declaredNullable !== actualNullable) {
          problems.push(
            `${config.name}.${columnName}: schema says ${declaredNullable ? 'nullable' : 'not null'}, database says ${actualNullable ? 'nullable' : 'not null'}`,
          );
        }

        const declaredGenerated = column.generated !== undefined;
        const actualGenerated = found.is_generated === 'ALWAYS';
        if (declaredGenerated !== actualGenerated) {
          problems.push(
            `${config.name}.${columnName}: schema says ${declaredGenerated ? 'generated' : 'writable'}, database says ${actualGenerated ? 'generated' : 'writable'}`,
          );
        }
      }

      const declaredNames = new Set(config.columns.map((c) => toSnakeCase(c.name)));
      for (const name of actual.keys()) {
        if (!declaredNames.has(name)) {
          problems.push(`${config.name}.${name}: in the database but not declared`);
        }
      }
    }

    expect(problems, 'run `npm run db:generate` — the schema and migrations disagree').toEqual([]);
  });

  it('keeps the derived editorial state generated on every stateful table', () => {
    // A writable editorial_state would be a second source of truth, which is
    // the failure the split state model exists to avoid.
    const stateful = [
      'peptides',
      'claims',
      'protocols',
      'quality_topics',
      'peptide_routes',
      'regulatory_statuses',
      'disagreements',
    ];

    for (const table of stateful) {
      const column = actualColumns.find(
        (c) => c.table_name === table && c.column_name === 'editorial_state',
      );
      expect(column?.is_generated, `${table}.editorial_state`).toBe('ALWAYS');
    }
  });
});
