/**
 * Migration: Create User collection indexes
 *
 * This migration creates the necessary indexes for the User collection
 * Note: Uses existing index names if they already exist in the database
 */

module.exports = {
  async up(db) {
    const collection = db.collection("users");
    
    // Check if collection exists before trying to list indexes
    const collections = await db.listCollections({ name: "users" }).toArray();
    const collectionExists = collections.length > 0;
    
    let existingIndexes = [];
    let indexNames = [];
    
    if (collectionExists) {
      existingIndexes = await collection.indexes();
      indexNames = existingIndexes.map((idx) => idx.name);
    }

    // Create unique index on email field (skip if email index already exists)
    const hasEmailIndex = existingIndexes.some(
      (idx) => idx.key && idx.key.email === 1
    );
    if (!hasEmailIndex) {
      await collection.createIndex(
        { email: 1 },
        { unique: true, name: "email_1", background: true }
      );
      console.log("✅ Created email index for users collection");
    } else {
      console.log("⏭️  Email index already exists, skipping");
    }

    // Create index on role for filtering
    if (!indexNames.includes("role_1")) {
      await collection.createIndex(
        { role: 1 },
        { name: "role_1", background: true }
      );
      console.log("✅ Created role index for users collection");
    } else {
      console.log("⏭️  Role index already exists, skipping");
    }

    // Create index on createdAt for sorting
    if (!indexNames.includes("createdAt_desc") && !indexNames.includes("createdAt_-1")) {
      await collection.createIndex(
        { createdAt: -1 },
        { name: "createdAt_desc", background: true }
      );
      console.log("✅ Created createdAt index for users collection");
    } else {
      console.log("⏭️  createdAt index already exists, skipping");
    }

    console.log("✅ User indexes migration complete");
  },

  async down(db) {
    const collection = db.collection("users");
    
    // Check if collection exists before trying to list indexes
    const collections = await db.listCollections({ name: "users" }).toArray();
    if (collections.length === 0) {
      console.log("⏭️  Users collection does not exist, nothing to rollback");
      return;
    }
    
    const existingIndexes = await collection.indexes();
    const indexNames = existingIndexes.map((idx) => idx.name);

    // Drop email index (check both possible names)
    if (indexNames.includes("email_1")) {
      await collection.dropIndex("email_1");
      console.log("✅ Dropped email index");
    }

    // Drop role index
    if (indexNames.includes("role_1")) {
      await collection.dropIndex("role_1");
      console.log("✅ Dropped role index");
    }

    // Drop createdAt index
    if (indexNames.includes("createdAt_desc")) {
      await collection.dropIndex("createdAt_desc");
      console.log("✅ Dropped createdAt index");
    } else if (indexNames.includes("createdAt_-1")) {
      await collection.dropIndex("createdAt_-1");
      console.log("✅ Dropped createdAt index");
    }

    console.log("✅ Dropped indexes for users collection");
  },
};

