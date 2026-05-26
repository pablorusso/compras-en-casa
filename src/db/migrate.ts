import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const { db } = await import("./index");
  const { sql } = await import("drizzle-orm");
  const { neon } = await import("@neondatabase/serverless");
  // Cliente HTTP directo de Neon. drizzle-orm/neon-http NO soporta
  // db.transaction(...) porque es single-shot HTTP, pero el cliente bajo de
  // Neon expone un endpoint /sql con `transaction([...])` que ejecuta un
  // batch atómico server-side. Lo usamos para aplicar los DDL de cada
  // migración en una sola transacción real, sin tener que cambiar el driver
  // del runtime de la app (que se beneficia del modo HTTP en edge).
  const httpClient = neon(process.env.DATABASE_URL!);
  const migrationsDir = join(process.cwd(), "src", "db", "migrations");

  // Tabla propia para trackear migraciones aplicadas. Lo hacemos manual porque la
  // DB ya tiene el schema 0000 aplicado fuera del migrator de drizzle, así que
  // arrancar con drizzle migrate falla intentando recrear tablas.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "_migrations_applied" (
      "filename" text PRIMARY KEY,
      "applied_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `);

  const allFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Bootstrap heuristics: detectar en qué estado está la DB cuando _migrations_applied
  // está vacía (instalación nueva o repo clonado con la DB ya provisionada).
  // - Estado legacy (pre-0002): existen `categories` y `subcategories`, y products.category_id ya
  //   está agregada (0001 corrió). Falta aplicar 0002.
  // - Estado actual (post-0002): existe `stores` y `categories` (la ex-subcategories ya renombrada),
  //   no existe `subcategories`. 0001 y 0002 ya se reflejan en el schema.
  const introspect = await db.execute<{
    subcategories_exists: boolean;
    stores_exists: boolean;
    products_category_id_exists: boolean;
  }>(sql`
    SELECT
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'subcategories') AS subcategories_exists,
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') AS stores_exists,
      EXISTS(
        SELECT 1 FROM information_schema.columns
         WHERE table_name = 'products' AND column_name = 'category_id'
      ) AS products_category_id_exists
  `);
  const row = introspect.rows[0];
  const subcategoriesExists = row?.subcategories_exists === true;
  const storesExists = row?.stores_exists === true;
  const productsCategoryIdExists = row?.products_category_id_exists === true;

  // 0001 está reflejada si products.category_id existe (legacy) o si ya pasamos a post-0002.
  const migration0001AlreadyApplied = productsCategoryIdExists || !subcategoriesExists;
  // 0002 está reflejada si la DB ya está en el estado nuevo (hay stores, no hay subcategories).
  const migration0002AlreadyApplied = storesExists && !subcategoriesExists;

  for (const filename of allFiles) {
    const [exists] = (
      await db.execute<{ filename: string }>(
        sql`SELECT filename FROM "_migrations_applied" WHERE filename = ${filename}`,
      )
    ).rows;
    if (exists) {
      console.log(`⏭️  ${filename} ya estaba aplicada`);
      continue;
    }

    // Heurística inicial: la 0000_init.sql ya está aplicada (la DB tiene el schema base).
    if (filename.startsWith("0000_")) {
      await db.execute(
        sql`INSERT INTO "_migrations_applied" ("filename") VALUES (${filename})`,
      );
      console.log(`✅ ${filename} marcada como aplicada (schema pre-existente)`);
      continue;
    }
    if (filename === "0001_narrow_thor_girl.sql" && migration0001AlreadyApplied) {
      await db.execute(
        sql`INSERT INTO "_migrations_applied" ("filename") VALUES (${filename})`,
      );
      console.log(`✅ ${filename} marcada como aplicada (schema ya refleja 0001)`);
      continue;
    }
    if (filename === "0002_rename_to_stores.sql" && migration0002AlreadyApplied) {
      await db.execute(
        sql`INSERT INTO "_migrations_applied" ("filename") VALUES (${filename})`,
      );
      console.log(`✅ ${filename} marcada como aplicada (schema ya refleja 0002)`);
      continue;
    }

    const fullPath = join(migrationsDir, filename);
    const raw = readFileSync(fullPath, "utf-8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`▶  Aplicando ${filename} (${statements.length} statements)…`);
    // Atomicidad multi-statement: el cliente HTTP de Neon expone `transaction([])`,
    // que envía el array entero en un BEGIN/COMMIT server-side. Si algún statement
    // falla, los anteriores se rollbackean automáticamente y el `await` rechaza.
    if (statements.length === 1) {
      await httpClient.query(statements[0]);
    } else {
      await httpClient.transaction(statements.map((stmt) => httpClient.query(stmt)));
    }
    await db.execute(
      sql`INSERT INTO "_migrations_applied" ("filename") VALUES (${filename})`,
    );
    console.log(`✅ ${filename} aplicada`);
  }

  console.log("Listo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
