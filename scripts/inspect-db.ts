/**
 * Script to inspect MongoDB collections and infer schema
 * Run: npx tsx scripts/inspect-db.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set");
  process.exit(1);
}

interface FieldInfo {
  type: string;
  count: number;
  examples: unknown[];
  isUnique?: boolean;
}

interface CollectionSchema {
  name: string;
  count: number;
  fields: Record<string, FieldInfo>;
  indexes: mongoose.mongo.IndexDescription[];
  sampleDoc: unknown;
}

function inferType(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) {
    if (value.length === 0) return "Array<unknown>";
    const elementTypes = [...new Set(value.map(inferType))];
    return `Array<${elementTypes.join(" | ")}>`;
  }
  if (value instanceof Date) return "Date";
  if (value instanceof mongoose.Types.ObjectId) return "ObjectId";
  if (typeof value === "object") {
    // Check if it's an ObjectId-like object
    if (
      value &&
      "_bsontype" in value &&
      (value as { _bsontype: string })._bsontype === "ObjectId"
    ) {
      return "ObjectId";
    }
    return "Object";
  }
  return typeof value;
}

async function analyzeCollection(
  db: mongoose.mongo.Db,
  collectionName: string
): Promise<CollectionSchema> {
  const collection = db.collection(collectionName);
  const count = await collection.countDocuments();
  const indexes = await collection.indexes();

  // Get sample documents (up to 100)
  const sampleSize = Math.min(count, 100);
  const samples = await collection.find().limit(sampleSize).toArray();

  const fields: Record<string, FieldInfo> = {};

  // Analyze each document
  for (const doc of samples) {
    for (const [key, value] of Object.entries(doc)) {
      const type = inferType(value);

      if (!fields[key]) {
        fields[key] = {
          type,
          count: 1,
          examples: [value],
        };
      } else {
        fields[key].count++;
        // Store unique examples (up to 3)
        if (
          fields[key].examples.length < 3 &&
          !fields[key].examples.some(
            (ex) => JSON.stringify(ex) === JSON.stringify(value)
          )
        ) {
          fields[key].examples.push(value);
        }
        // Update type if different
        if (!fields[key].type.includes(type)) {
          fields[key].type = `${fields[key].type} | ${type}`;
        }
      }
    }
  }

  // Check for unique indexes
  for (const index of indexes) {
    if (index.unique && index.key) {
      const indexFields = Object.keys(index.key);
      for (const field of indexFields) {
        if (fields[field]) {
          fields[field].isUnique = true;
        }
      }
    }
  }

  return {
    name: collectionName,
    count,
    fields,
    indexes,
    sampleDoc: samples[0] || null,
  };
}

function generateMongooseSchema(schema: CollectionSchema): string {
  const { name, fields } = schema;

  // Generate interface
  let interfaceCode = `export interface I${capitalize(singularize(name))} {\n`;
  interfaceCode += `  _id: mongoose.Types.ObjectId;\n`;

  for (const [fieldName, info] of Object.entries(fields)) {
    if (fieldName === "_id") continue;

    const tsType = mongoTypeToTypeScript(info.type);
    interfaceCode += `  ${fieldName}: ${tsType};\n`;
  }

  interfaceCode += `}\n`;

  // Generate schema
  let schemaCode = `const ${singularize(name)}Schema = new Schema<I${capitalize(singularize(name))}>(\n  {\n`;

  for (const [fieldName, info] of Object.entries(fields)) {
    if (fieldName === "_id") continue;

    const mongooseType = inferMongooseType(info.type);
    schemaCode += `    ${fieldName}: {\n`;
    schemaCode += `      type: ${mongooseType},\n`;

    if (info.isUnique) {
      schemaCode += `      unique: true,\n`;
    }

    schemaCode += `    },\n`;
  }

  schemaCode += `  },\n`;

  // Add timestamps if createdAt/updatedAt exist
  if (fields.createdAt || fields.updatedAt) {
    schemaCode += `  { timestamps: true }\n`;
  }

  schemaCode += `);\n`;

  // Generate model
  const modelName = capitalize(singularize(name));
  let modelCode = `const ${modelName} =\n`;
  modelCode += `  (mongoose.models.${modelName} as Model<I${modelName}>) ||\n`;
  modelCode += `  mongoose.model<I${modelName}>("${modelName}", ${singularize(name)}Schema);\n\n`;
  modelCode += `export default ${modelName};\n`;

  return `import mongoose, { Schema, Model } from "mongoose";\n\n${interfaceCode}\n${schemaCode}\n${modelCode}`;
}

function mongoTypeToTypeScript(type: string): string {
  const typeMap: Record<string, string> = {
    string: "string",
    number: "number",
    boolean: "boolean",
    Date: "Date",
    ObjectId: "mongoose.Types.ObjectId",
    Object: "Record<string, unknown>",
    null: "null",
    undefined: "undefined",
  };

  // Handle union types
  if (type.includes(" | ")) {
    const types = type.split(" | ");
    return types.map((t) => typeMap[t] || t).join(" | ");
  }

  // Handle arrays
  if (type.startsWith("Array<")) {
    const innerType = type.slice(6, -1);
    return `${mongoTypeToTypeScript(innerType)}[]`;
  }

  return typeMap[type] || "unknown";
}

function inferMongooseType(type: string): string {
  const typeMap: Record<string, string> = {
    string: "String",
    number: "Number",
    boolean: "Boolean",
    Date: "Date",
    ObjectId: "Schema.Types.ObjectId",
    Object: "Schema.Types.Mixed",
  };

  // Handle arrays
  if (type.startsWith("Array<")) {
    const innerType = type.slice(6, -1).split(" | ")[0];
    return `[${typeMap[innerType] || "Schema.Types.Mixed"}]`;
  }

  return typeMap[type.split(" | ")[0]] || "Schema.Types.Mixed";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function singularize(str: string): string {
  // Simple singularization (handles common cases)
  if (str.endsWith("ies")) return str.slice(0, -3) + "y";
  if (str.endsWith("es")) return str.slice(0, -2);
  if (str.endsWith("s")) return str.slice(0, -1);
  return str;
}

async function main() {
  console.log("🔍 Connecting to MongoDB...\n");

  await mongoose.connect(MONGODB_URI!);
  const db = mongoose.connection.db;

  if (!db) {
    console.error("❌ Failed to get database instance");
    process.exit(1);
  }

  // Get all collections (excluding system collections)
  const collections = await db.listCollections().toArray();
  const userCollections = collections.filter(
    (c) => !c.name.startsWith("system.") && c.name !== "changelog"
  );

  console.log(`📊 Found ${userCollections.length} collection(s):\n`);

  const schemas: CollectionSchema[] = [];

  for (const collection of userCollections) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📁 Collection: ${collection.name}`);
    console.log(`${"=".repeat(60)}`);

    const schema = await analyzeCollection(db, collection.name);
    schemas.push(schema);

    console.log(`   Documents: ${schema.count}`);
    console.log(`\n   📋 Fields:`);

    for (const [fieldName, info] of Object.entries(schema.fields)) {
      const uniqueMarker = info.isUnique ? " (UNIQUE)" : "";
      console.log(`      - ${fieldName}: ${info.type}${uniqueMarker}`);
    }

    console.log(`\n   🔑 Indexes:`);
    for (const index of schema.indexes) {
      const indexKeys = Object.entries(index.key || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const options = [];
      if (index.unique) options.push("unique");
      if (index.sparse) options.push("sparse");
      if ("expireAfterSeconds" in index)
        options.push(`TTL: ${index.expireAfterSeconds}s`);
      const optStr = options.length > 0 ? ` [${options.join(", ")}]` : "";
      console.log(`      - ${index.name}: { ${indexKeys} }${optStr}`);
    }

    if (schema.sampleDoc) {
      console.log(`\n   📄 Sample Document:`);
      console.log(
        `      ${JSON.stringify(schema.sampleDoc, null, 2).replace(/\n/g, "\n      ")}`
      );
    }
  }

  // Generate Mongoose models
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("🏗️  GENERATED MONGOOSE MODELS");
  console.log(`${"=".repeat(60)}\n`);

  for (const schema of schemas) {
    console.log(`\n// ========== ${schema.name} ==========`);
    console.log(`// Save to: src/lib/db/models/${singularize(schema.name)}.ts`);
    console.log("// -----------------------------------------\n");
    console.log(generateMongooseSchema(schema));
  }

  // Generate migrations
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("📜 SUGGESTED MIGRATIONS");
  console.log(`${"=".repeat(60)}\n`);

  for (const schema of schemas) {
    const existingIndexes = schema.indexes.filter(
      (idx) => idx.name !== "_id_"
    );
    if (existingIndexes.length > 0) {
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:T]/g, "")
        .slice(0, 14);
      console.log(
        `\n// Migration: migrations/${timestamp}-create-${schema.name}-indexes.js\n`
      );
      console.log(`module.exports = {`);
      console.log(`  async up(db) {`);

      for (const index of existingIndexes) {
        const options: Record<string, unknown> = { name: index.name };
        if (index.unique) options.unique = true;
        if (index.sparse) options.sparse = true;
        if ("expireAfterSeconds" in index)
          options.expireAfterSeconds = index.expireAfterSeconds;

        console.log(
          `    await db.collection("${schema.name}").createIndex(`
        );
        console.log(`      ${JSON.stringify(index.key)},`);
        console.log(`      ${JSON.stringify(options)}`);
        console.log(`    );`);
      }

      console.log(`    console.log("✅ Created indexes for ${schema.name}");`);
      console.log(`  },\n`);
      console.log(`  async down(db) {`);

      for (const index of existingIndexes) {
        console.log(
          `    await db.collection("${schema.name}").dropIndex("${index.name}");`
        );
      }

      console.log(`    console.log("✅ Dropped indexes for ${schema.name}");`);
      console.log(`  },`);
      console.log(`};`);
    }
  }

  await mongoose.disconnect();
  console.log("\n✅ Done!");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

