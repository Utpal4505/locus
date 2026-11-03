import { db } from '@locus/database';

export const DRIZZLE_DB = Symbol('DRIZZLE_DB');
export type DrizzleDb = typeof db;

