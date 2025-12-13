module.exports = {
  async up(db) {
    const activityLogsCollection = db.collection("activitylogs");

    // Create index on userId
    await activityLogsCollection.createIndex({ userId: 1 });

    // Create index on entityType
    await activityLogsCollection.createIndex({ entityType: 1 });

    // Create index on entityId
    await activityLogsCollection.createIndex({ entityId: 1 });

    // Create index on createdAt (for date range queries)
    await activityLogsCollection.createIndex({ createdAt: -1 });

    // Create compound index for common queries
    await activityLogsCollection.createIndex({ entityType: 1, entityId: 1 });
    await activityLogsCollection.createIndex({ userId: 1, createdAt: -1 });
  },

  async down(db) {
    const activityLogsCollection = db.collection("activitylogs");
    await activityLogsCollection.dropIndex("userId_1").catch(() => {});
    await activityLogsCollection.dropIndex("entityType_1").catch(() => {});
    await activityLogsCollection.dropIndex("entityId_1").catch(() => {});
    await activityLogsCollection.dropIndex("createdAt_-1").catch(() => {});
    await activityLogsCollection.dropIndex("entityType_1_entityId_1").catch(() => {});
    await activityLogsCollection.dropIndex("userId_1_createdAt_-1").catch(() => {});
  },
};
