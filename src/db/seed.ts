import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "./index";
import { settings } from "./schema";
import { sql } from "drizzle-orm";

async function main() {
  await db
    .insert(settings)
    .values({ id: 1 })
    .onConflictDoNothing({ target: settings.id });
  const rows = await db.execute<{
    id: number;
    admin_password_hash: string | null;
    history_limit: number;
  }>(sql`select id, admin_password_hash, history_limit from settings where id = 1`);
  console.log("Settings row:", rows.rows[0]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
