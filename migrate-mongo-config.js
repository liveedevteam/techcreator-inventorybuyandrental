// In this file you can configure migrate-mongo
require("dotenv").config({ path: ".env.local" });

const config = {
  mongodb: {
    url: process.env.MONGODB_URI || "mongodb://localhost:27017/loops-backoffice",

    // Optional database name, fallback to database name from URL
    databaseName: process.env.MONGODB_DATABASE || "",

    options: {
      // useNewUrlParser: true, // removed in mongodb driver 4.0.0
      // useUnifiedTopology: true, // removed in mongodb driver 4.0.0
    },
  },

  // The migrations dir, can be an relative or absolute path
  migrationsDir: "migrations",

  // The mongodb collection where the applied changes are stored
  changelogCollectionName: "changelog",

  // The file extension to create migrations and search for in migration dir
  migrationFileExtension: ".js",

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determine
  // if the file should be run. Requires that scripts are coded to be run multiple times.
  useFileHash: false,

  // Don't change this, unless you know what you're doing
  moduleSystem: "commonjs",
};

module.exports = config;

