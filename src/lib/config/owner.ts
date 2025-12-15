/**
 * Owner/Company Configuration
 *
 * This file contains the owner/company information used in bills and receipts.
 * Update these values with your actual business information.
 */

export const ownerConfig = {
  name: process.env.NEXT_PUBLIC_OWNER_NAME || "บริษัท ตัวอย่าง จำกัด",
  address:
    process.env.NEXT_PUBLIC_OWNER_ADDRESS ||
    "123 ถนนตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพมหานคร 10110",
  phone: process.env.NEXT_PUBLIC_OWNER_PHONE || "02-123-4567",
  logo: process.env.NEXT_PUBLIC_OWNER_LOGO || "/logo.png", // Path to logo image
  bankName: process.env.NEXT_PUBLIC_OWNER_BANK_NAME || "ธนาคารไทยพาณิชย์",
  bankAccount: process.env.NEXT_PUBLIC_OWNER_BANK_ACCOUNT || "435-210806-1",
  bankAccountName: process.env.NEXT_PUBLIC_OWNER_BANK_ACCOUNT_NAME || "นาย ตัวอย่าง ตัวอย่าง",
};
