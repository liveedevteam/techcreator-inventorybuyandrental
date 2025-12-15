module.exports = {
  async up(db) {
    const rentalAssetsCollection = db.collection("rentalassets");

    // Drop the unique index on assetCode
    try {
      await rentalAssetsCollection.dropIndex("assetCode_1");
      console.log("Dropped unique index on assetCode");
    } catch (_error) {
      // Index might not exist, continue
      console.log("Index assetCode_1 not found or already dropped");
    }

    // Create a compound index on assetCode + productId for better query performance
    // This allows same asset code for different products but ensures uniqueness per product
    await rentalAssetsCollection.createIndex(
      { assetCode: 1, productId: 1 },
      { name: "assetCode_productId_1" }
    );
    console.log("Created compound index on assetCode + productId");
  },

  async down(db) {
    const rentalAssetsCollection = db.collection("rentalassets");

    // Drop the compound index
    try {
      await rentalAssetsCollection.dropIndex("assetCode_productId_1");
      console.log("Dropped compound index on assetCode + productId");
    } catch (_error) {
      console.log("Index assetCode_productId_1 not found");
    }

    // Recreate the unique index on assetCode (revert to old behavior)
    await rentalAssetsCollection.createIndex({ assetCode: 1 }, { unique: true });
    console.log("Recreated unique index on assetCode");
  },
};
