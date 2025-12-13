import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI!;
const EMAIL = process.argv[2];
const NEW_PASSWORD = process.argv[3];

async function changePassword() {
  if (!MONGODB_URI) {
    console.error("Please set MONGODB_URI environment variable");
    process.exit(1);
  }

  if (!EMAIL || !NEW_PASSWORD) {
    console.error("Usage: tsx scripts/change-password.ts <email> <new-password>");
    console.error("Example: tsx scripts/change-password.ts admin@example.com newpassword123");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },
  });

  const User = mongoose.models.User || mongoose.model("User", userSchema);

  const user = await User.findOne({ email: EMAIL });
  if (!user) {
    console.error(`User with email ${EMAIL} not found`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

  await User.updateOne({ email: EMAIL }, { password: hashedPassword });

  console.log(`Password updated successfully for ${EMAIL}`);
  await mongoose.disconnect();
}

changePassword().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
