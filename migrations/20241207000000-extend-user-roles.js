module.exports = {
  async up(db) {
    // Update existing users if needed (no changes required as enum is backward compatible)
    // Add index for role field if not exists
    const usersCollection = db.collection("users");
    const indexes = await usersCollection.indexes();
    const hasRoleIndex = indexes.some((idx) => idx.key && idx.key.role);

    if (!hasRoleIndex) {
      await usersCollection.createIndex({ role: 1 });
    }
  },

  async down(db) {
    // Remove role index
    const usersCollection = db.collection("users");
    await usersCollection.dropIndex("role_1").catch(() => {
      // Index might not exist, ignore error
    });
  },
};
