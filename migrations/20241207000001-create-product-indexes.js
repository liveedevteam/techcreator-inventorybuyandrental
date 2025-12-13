module.exports = {
  async up(db) {
    const productsCollection = db.collection("products");

    // Create unique index on sku
    await productsCollection.createIndex({ sku: 1 }, { unique: true });

    // Create index on category
    await productsCollection.createIndex({ category: 1 });

    // Create index on stockType
    await productsCollection.createIndex({ stockType: 1 });

    // Create index on createdBy
    await productsCollection.createIndex({ createdBy: 1 });
  },

  async down(db) {
    const productsCollection = db.collection("products");
    await productsCollection.dropIndex("sku_1").catch(() => {});
    await productsCollection.dropIndex("category_1").catch(() => {});
    await productsCollection.dropIndex("stockType_1").catch(() => {});
    await productsCollection.dropIndex("createdBy_1").catch(() => {});
  },
};
