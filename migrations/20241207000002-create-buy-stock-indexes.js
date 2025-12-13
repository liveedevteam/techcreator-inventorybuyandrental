module.exports = {
  async up(db) {
    const buyStockCollection = db.collection("buystocks");

    // Create unique index on productId
    await buyStockCollection.createIndex({ productId: 1 }, { unique: true });

    // Create index on quantity
    await buyStockCollection.createIndex({ quantity: 1 });

    // Create index on lastUpdatedBy
    await buyStockCollection.createIndex({ lastUpdatedBy: 1 });
  },

  async down(db) {
    const buyStockCollection = db.collection("buystocks");
    await buyStockCollection.dropIndex("productId_1").catch(() => {});
    await buyStockCollection.dropIndex("quantity_1").catch(() => {});
    await buyStockCollection.dropIndex("lastUpdatedBy_1").catch(() => {});
  },
};
