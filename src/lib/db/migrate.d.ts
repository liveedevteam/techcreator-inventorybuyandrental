// Type declarations for migrate-mongo
declare module "migrate-mongo" {
  export const database: {
    connect(): Promise<{
      db: import("mongodb").Db;
      client: import("mongodb").MongoClient;
    }>;
  };

  export const config: {
    read(): Promise<void>;
    set(config: object): void;
  };

  export function up(
    db: import("mongodb").Db,
    client: import("mongodb").MongoClient
  ): Promise<string[]>;

  export function down(
    db: import("mongodb").Db,
    client: import("mongodb").MongoClient
  ): Promise<string[]>;

  export function status(
    db: import("mongodb").Db
  ): Promise<Array<{ fileName: string; appliedAt: string }>>;

  export function create(name: string): Promise<string>;
}

