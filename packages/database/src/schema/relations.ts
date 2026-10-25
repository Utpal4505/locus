import { defineRelations } from "drizzle-orm";
import { user, session, account } from "./auth.js";

export const relations = defineRelations({ user, session, account }, (r) => ({
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
  },
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },
}));

