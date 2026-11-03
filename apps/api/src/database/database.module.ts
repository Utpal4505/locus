import { Global, Module } from '@nestjs/common';
import { db } from '@locus/database';
import { DRIZZLE_DB } from './database.tokens.js';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      useValue: db,
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}

