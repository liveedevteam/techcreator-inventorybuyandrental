module.exports = {
  async up(db) {
    const rentalsCollection = db.collection("rentals");

    // Create unique index on rentalNumber
    await rentalsCollection.createIndex({ rentalNumber: 1 }, { unique: true });

    // Create index on customerEmail
    await rentalsCollection.createIndex({ customerEmail: 1 });

    // Create index on status
    await rentalsCollection.createIndex({ status: 1 });

    // Create index on startDate
    await rentalsCollection.createIndex({ startDate: 1 });

    // Create index on endDate
    await rentalsCollection.createIndex({ endDate: 1 });

    // Create index on createdBy
    await rentalsCollection.createIndex({ createdBy: 1 });
  },

  async down(db) {
    const rentalsCollection = db.collection("rentals");
    await rentalsCollection.dropIndex("rentalNumber_1").catch(() => {});
    await rentalsCollection.dropIndex("customerEmail_1").catch(() => {});
    await rentalsCollection.dropIndex("status_1").catch(() => {});
    await rentalsCollection.dropIndex("startDate_1").catch(() => {});
    await rentalsCollection.dropIndex("endDate_1").catch(() => {});
    await rentalsCollection.dropIndex("createdBy_1").catch(() => {});
  },
};
