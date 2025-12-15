/**
 * Owner/Company Configuration
 *
 * This file contains the owner/company information used in bills and receipts.
 * Update these values with your actual business information.
 */

export const ownerConfig = {
  name: process.env.NEXT_PUBLIC_OWNER_NAME || "ร้านศิริพันธุ์ แบบเช่า",
  address: process.env.NEXT_PUBLIC_OWNER_ADDRESS || "171 ม.7 ต.คลองทรายขาว อ.กงหรา จ.พัทลุง 93180",
  phone: process.env.NEXT_PUBLIC_OWNER_PHONE || "080-0021284",
  logo: process.env.NEXT_PUBLIC_OWNER_LOGO || "/logo.png", // Path to logo image
  bankName: process.env.NEXT_PUBLIC_OWNER_BANK_NAME || "ธนาคารไทยพาณิชย์",
  bankAccount: process.env.NEXT_PUBLIC_OWNER_BANK_ACCOUNT || "435-210806-1",
  bankAccountName: process.env.NEXT_PUBLIC_OWNER_BANK_ACCOUNT_NAME || "นาย เอกฉัตร พิชิตชลพันธุ์",
};
