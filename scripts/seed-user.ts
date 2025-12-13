import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI!;

async function seedUser() {
  if (!MONGODB_URI) {
    console.error("Please set MONGODB_URI environment variable");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  // Define user schema inline for the script
  const userSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      password: { type: String, required: true, select: false },
      role: { type: String, enum: ["admin", "user"], default: "user" },
    },
    { timestamps: true }
  );

  const User = mongoose.models.User || mongoose.model("User", userSchema);

  const email = "admin@example.com";
  const password = "admin123"; // Change this!
  const name = "Admin";
  const role = "admin";

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log(`User with email ${email} already exists`);
    await mongoose.disconnect();
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create admin user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
  });

  console.log("Admin user created successfully:");
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role: ${role}`);
  console.log(`  ID: ${user._id}`);
  console.log("\n⚠️  Please change the password immediately after first login!");

  await mongoose.disconnect();
  console.log("Done!");
}

seedUser().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

