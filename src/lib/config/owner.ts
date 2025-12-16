/**
 * Owner/Company Configuration
 *
 * This file contains the owner/company information used in bills and receipts.
 * Update these values with your actual business information.
 */

export const ownerConfig = {
  name: process.env.NEXT_PUBLIC_OWNER_NAME || "ร้านศิริพันธุ์ แบบเช่า",
  address:
    process.env.NEXT_PUBLIC_OWNER_ADDRESS || "ม.5 บ้านม่วงลูกดำ ต .ชุมพล อ. ศรีนครินทร์ จ.พัทลุง",
  phone: process.env.NEXT_PUBLIC_OWNER_PHONE || "080-0021284",
  logo: process.env.NEXT_PUBLIC_OWNER_LOGO || "/logo.png", // Path to logo image
  bankName: process.env.NEXT_PUBLIC_OWNER_BANK_NAME || "ธนาคารไทยพาณิชย์",
  bankBranch: process.env.NEXT_PUBLIC_OWNER_BANK_BRANCH || "สาขาโลตัสพัทลุง",
  bankAccount: process.env.NEXT_PUBLIC_OWNER_BANK_ACCOUNT || "415-226332-0",
  bankAccountName: process.env.NEXT_PUBLIC_OWNER_BANK_ACCOUNT_NAME || "นาย ศิริพันธุ์ บุญพหาลา",
};
