/**
 * Migration: Create Sale Indexes
 * 
 * Creates indexes for the Sale collection to improve query performance.
 */

module.exports = {
  async up(db) {
    // Create indexes for Sale collection
    await db.collection("sales").createIndex(
      { billNumber: 1 },
      { unique: true, name: "billNumber_1" }
    );
    
    await db.collection("sales").createIndex(
      { createdAt: -1 },
      { name: "createdAt_-1" }
    );
    
    await db.collection("sales").createIndex(
      { customerName: 1 },
      { name: "customerName_1" }
    );
    
    await db.collection("sales").createIndex(
      { status: 1 },
      { name: "status_1" }
    );
    
    await db.collection("sales").createIndex(
      { paymentStatus: 1 },
      { name: "paymentStatus_1" }
    );

    console.log("✅ Created indexes for sales");
  },

  async down(db) {
    // Drop indexes
    await db.collection("sales").dropIndex("billNumber_1");
    await db.collection("sales").dropIndex("createdAt_-1");
    await db.collection("sales").dropIndex("customerName_1");
    await db.collection("sales").dropIndex("status_1");
    await db.collection("sales").dropIndex("paymentStatus_1");

    console.log("✅ Dropped indexes for sales");
  },
};
