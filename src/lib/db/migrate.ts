import { database, config, up, down, status } from "migrate-mongo";

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  const { db, client } = await database.connect();

  try {
    const migrated = await up(db, client);
    migrated.forEach((fileName) => console.log("Migrated:", fileName));

    if (migrated.length === 0) {
      console.log("No pending migrations");
    }
  } finally {
    await client.close();
  }
}

/**
 * Rollback the last migration
 */
export async function rollbackMigration(): Promise<void> {
  const { db, client } = await database.connect();

  try {
    const migratedDown = await down(db, client);
    migratedDown.forEach((fileName) => console.log("Rolled back:", fileName));
  } finally {
    await client.close();
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<
  Array<{ fileName: string; appliedAt: string }>
> {
  const { db, client } = await database.connect();

  try {
    const migrationStatus = await status(db);
    return migrationStatus;
  } finally {
    await client.close();
  }
}

/**
 * Initialize migrate-mongo config
 */
export async function initMigrationConfig(): Promise<void> {
  // Load config from migrate-mongo-config.js
  await config.read();
}

