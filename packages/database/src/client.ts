import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Column, SQL, is } from "drizzle-orm";
import { relations } from "./schema/relations.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

export const pool = new Pool({
  connectionString,
});

const baseDb = drizzle({ client: pool, relations });

// Drizzle 1.x moved schema relations to `db._.relations`, while Better Auth's Drizzle adapter
// reads `db._.schema` to discover model relation keys.
if (baseDb._ && !(baseDb._ as Record<string, unknown>).schema && (baseDb._ as Record<string, unknown>).relations) {
  (baseDb._ as Record<string, unknown>).schema = (baseDb._ as Record<string, unknown>).relations;
}

/**
 * Remaps column references inside a Drizzle SQL expression from the real table
 * to the aliased table provided by Drizzle's `RAW` callback.
 *
 * Context: In Drizzle v1 RC, `db.query[model].findMany/findFirst` aliases the
 * FROM table (e.g. as "d0") inside LATERAL subqueries. When a `{ RAW: fn }`
 * filter is used, Drizzle calls `fn(aliasedTable)`. The previous wrapper
 * captured `{ RAW: () => rawWhere }` — ignoring the aliased table argument —
 * so the emitted SQL referenced the real table name instead of the alias,
 * causing PostgreSQL error 42P01:
 *   "invalid reference to FROM-clause entry for table 'account'"
 *   HINT: Perhaps you meant to reference the table alias "d0".
 *
 * This function walks the SQL expression's `queryChunks` recursively and
 * replaces each Column with the matching column on the aliased table (looked
 * up by `column.name`), producing SQL that references the correct alias.
 *
 * NOTE: Relies on `SQL.queryChunks` from drizzle-orm@1.0.0-rc.4. Re-evaluate
 * if the package is upgraded to a stable v1 release.
 */
function remapSQLToAliasedTable(
  expr: SQL,
  aliasedTable: Record<string, Column>,
): SQL {
  const remappedChunks = expr.queryChunks.map((chunk) => {
    if (is(chunk, Column)) {
      const mapped = aliasedTable[chunk.name];
      return mapped !== undefined ? mapped : chunk;
    }
    if (chunk instanceof SQL) {
      return remapSQLToAliasedTable(chunk, aliasedTable);
    }
    return chunk;
  });
  return new SQL(remappedChunks);
}

/**
 * Compatibility bridge between Drizzle ORM v1.0.0-rc relational queries and Better Auth's Drizzle adapter.
 *
 * Better Auth passes raw SQL expression chunks (e.g. `eq(table.token, token)`) into
 * `db.query[model].findFirst({ where: clause })`. In Drizzle v1-rc,
 * `relationsFilterToSQL` expects a relational filter object or a `{ RAW: fn }` wrapper,
 * where `fn` receives the aliased table as its first argument.
 *
 * The `RAW` callback MUST use the aliased table to rebuild column references —
 * not the original table — otherwise PostgreSQL rejects the query with error 42P01:
 *   "invalid reference to FROM-clause entry for table 'account'"
 */
function wrapRelationalQuery<T extends object>(query: T): T {
  if (!query || typeof query !== "object") return query;
  return new Proxy(query, {
    get(target, modelName) {
      const modelQuery = Reflect.get(target, modelName);
      if (!modelQuery || typeof modelQuery !== "object") return modelQuery;
      return new Proxy(modelQuery, {
        get(mTarget, methodName) {
          const method = Reflect.get(mTarget, methodName);
          if (methodName === "findFirst" || methodName === "findMany") {
            return function (options: Record<string, unknown> = {}) {
              const where = options?.where;
              if (
                where instanceof SQL &&
                !("RAW" in (where as object))
              ) {
                const rawWhere = where;
                options = {
                  ...options,
                  where: {
                    RAW: (aliasedTable: Record<string, Column>) =>
                      remapSQLToAliasedTable(rawWhere, aliasedTable),
                  },
                };
              }
              return (method as (opts: Record<string, unknown>) => unknown).call(mTarget, options);
            };
          }
          return method;
        },
      });
    },
  });
}

export const db = new Proxy(baseDb, {
  get(target, prop, receiver) {
    if (prop === "query") {
      return wrapRelationalQuery(target.query);
    }
    return Reflect.get(target, prop, receiver);
  },
});
