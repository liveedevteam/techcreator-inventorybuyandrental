module.exports = {
  async up(db) {
    const rentalAssetsCollection = db.collection("rentalassets");

    // Create unique index on assetCode
    await rentalAssetsCollection.createIndex({ assetCode: 1 }, { unique: true });

    // Create index on productId
    await rentalAssetsCollection.createIndex({ productId: 1 });

    // Create index on status
    await rentalAssetsCollection.createIndex({ status: 1 });

    // Create index on currentRentalId
    await rentalAssetsCollection.createIndex({ currentRentalId: 1 });
  },

  async down(db) {
    const rentalAssetsCollection = db.collection("rentalassets");
    await rentalAssetsCollection.dropIndex("assetCode_1").catch(() => {});
    await rentalAssetsCollection.dropIndex("productId_1").catch(() => {});
    await rentalAssetsCollection.dropIndex("status_1").catch(() => {});
    await rentalAssetsCollection.dropIndex("currentRentalId_1").catch(() => {});
  },
};
