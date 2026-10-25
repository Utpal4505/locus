import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
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
if (baseDb._ && !(baseDb._ as any).schema && (baseDb._ as any).relations) {
  (baseDb._ as any).schema = (baseDb._ as any).relations;
}

/**
 * Compatibility bridge between Drizzle ORM v1.0.0-rc relational queries and Better Auth's Drizzle adapter.
 * Better Auth passes raw SQL expression chunks (e.g. eq(table.token, token)) into `db.query[model].findFirst({ where: clause })`.
 * In Drizzle v1-rc, `relationsFilterToSQL` expects a relational filter object or a `{ RAW: sql }` wrapper.
 * Passing an unwrapped SQL chunk causes Drizzle to iterate its properties (such as "decoder"), throwing:
 * `DrizzleError: Unknown relational filter field: "decoder"`.
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
            return function (options: any = {}) {
              if (
                options?.where &&
                !("RAW" in options.where) &&
                ("decoder" in options.where ||
                  "queryChunks" in options.where ||
                  typeof options.where.getSQL === "function")
              ) {
                const rawWhere = options.where;
                options = { ...options, where: { RAW: () => rawWhere } };
              }
              return (method as any).call(mTarget, options);
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
