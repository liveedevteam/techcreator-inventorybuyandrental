"use client";

import { use, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components";
import { Printer, X, Loader2 } from "lucide-react";
import { ownerConfig } from "@/lib/config/owner";
import Image from "next/image";

interface RentalBillPageProps {
  params: Promise<{ id: string }>;
}

export default function RentalBillPage({ params }: RentalBillPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const billRef = useRef<HTMLDivElement>(null);

  const { data: rental, isLoading } = trpc.rental.getById.useQuery({ id });

  const handlePrint = () => {
    if (billRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>ใบสัญญาเช่า/ใบรับเงิน/ใบส่งของ - ${rental?.rentalNumber || ""}</title>
              <style>
                @page {
                  size: A4;
                  margin: 1cm;
                }
                * {
                  box-sizing: border-box;
                }
                body {
                  font-family: 'Sarabun', 'Kanit', 'Prompt', sans-serif;
                  margin: 0;
                  padding: 20px;
                  color: #1a1a1a;
                  font-size: 14px;
                  background: #f5f5f5;
                }
                .bill-container {
                  max-width: 210mm;
                  margin: 0 auto;
                  background: white;
                  padding: 25px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .header-section {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin-bottom: 25px;
                  padding-bottom: 20px;
                  border-bottom: 3px solid #2563eb;
                }
                .company-logo {
                  width: 150px;
                  margin-bottom: 10px;
                }
                .company-logo img {
                  width: 100%;
                  height: auto;
                  object-fit: contain;
                  border-radius: 4px;
                }
                .company-info {
                  flex: 1;
                  margin-left: 20px;
                  padding-left: 20px;
                  border-left: 2px solid #e5e7eb;
                }
                .company-name {
                  font-size: 20px;
                  font-weight: 700;
                  margin-bottom: 8px;
                  color: #1e40af;
                  letter-spacing: 0.5px;
                }
                .company-address {
                  font-size: 13px;
                  line-height: 1.6;
                  color: #4b5563;
                }
                .company-phone {
                  font-size: 14px;
                  margin-top: 8px;
                  color: #1e40af;
                  font-weight: 600;
                }
                .document-title {
                  text-align: center;
                  flex: 1;
                  padding: 10px;
                  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
                  border-radius: 8px;
                  color: white;
                  margin-left: 20px;
                }
                .document-title h1 {
                  font-size: 22px;
                  font-weight: 700;
                  margin: 0;
                  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .dates-section {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 15px;
                  margin: 20px 0;
                  padding: 15px;
                  background: #f8fafc;
                  border-radius: 8px;
                  border: 1px solid #e2e8f0;
                }
                .date-field {
                  display: flex;
                  flex-direction: column;
                  gap: 5px;
                }
                .date-label {
                  font-weight: 600;
                  font-size: 12px;
                  color: #64748b;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .date-value {
                  border-bottom: 2px solid #2563eb;
                  min-width: 120px;
                  padding: 6px 8px;
                  font-size: 14px;
                  font-weight: 600;
                  color: #1e293b;
                  background: white;
                  border-radius: 4px;
                }
                .customer-section {
                  margin: 20px 0;
                  padding: 15px;
                  background: #f8fafc;
                  border-radius: 8px;
                  border-left: 4px solid #2563eb;
                }
                .customer-label {
                  font-weight: 700;
                  margin-bottom: 8px;
                  color: #1e40af;
                  font-size: 15px;
                }
                .customer-name {
                  border-bottom: 2px solid #2563eb;
                  min-width: 200px;
                  padding: 8px 12px;
                  display: inline-block;
                  font-size: 16px;
                  font-weight: 600;
                  color: #1e293b;
                  background: white;
                  border-radius: 4px;
                }
                .items-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
                  font-size: 12px;
                  border: 2px solid #000000 !important;
                }
                .items-table th,
                .items-table td {
                  padding: 8px 6px;
                  text-align: left;
                  border: 1px solid #000000 !important;
                }
                .items-table th {
                  background: #1e40af;
                  color: white;
                  font-weight: 700;
                  text-align: center;
                  font-size: 12px;
                  padding: 10px 6px;
                  border: 1px solid #000000 !important;
                }
                .items-table td {
                  vertical-align: middle;
                  background: white;
                  font-size: 12px;
                  border: 1px solid #000000 !important;
                }
                .items-table tbody tr {
                  background: white;
                }
                .items-table tbody tr.total-row {
                  background: #bfdbfe;
                  font-weight: 700;
                }
                .items-table tbody tr.total-row td {
                  background: #bfdbfe;
                  font-size: 13px;
                  border: 1px solid #000000 !important;
                }
                .text-right {
                  text-align: right;
                }
                .text-center {
                  text-align: center;
                }
                .summary-section {
                  display: flex;
                  justify-content: space-between;
                  margin-top: 25px;
                  gap: 30px;
                }
                .summary-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
                  font-size: 13px;
                  border: 2px solid #000000 !important;
                }
                .summary-table td {
                  padding: 8px 12px;
                  border: 1px solid #000000 !important;
                  background: white;
                }
                .summary-table td:first-child {
                  font-weight: 600;
                  color: #475569;
                  width: 60%;
                }
                .summary-table td:last-child {
                  text-align: right;
                  font-weight: 600;
                  color: #1e293b;
                  width: 40%;
                }
                .summary-table tr.total-row td {
                  background: #bfdbfe;
                  font-weight: 700;
                  font-size: 16px;
                  border-top: 2px solid #000000 !important;
                  border-bottom: 2px solid #000000 !important;
                }
                .summary-table tr.total-row td:first-child {
                  color: #1e40af;
                }
                .summary-table tr.total-row td:last-child {
                  color: #1e40af;
                }
                .payment-section {
                  flex: 1;
                  padding: 20px;
                  background: #f8fafc;
                  border-radius: 8px;
                  border: 1px solid #e2e8f0;
                }
                .payment-title {
                  font-weight: 700;
                  margin-bottom: 15px;
                  font-size: 16px;
                  color: #1e40af;
                  padding-bottom: 8px;
                  border-bottom: 2px solid #2563eb;
                }
                .payment-info {
                  font-size: 13px;
                  line-height: 1.8;
                  color: #475569;
                }
                .payment-info p {
                  margin: 8px 0;
                }
                .payment-info strong {
                  color: #1e40af;
                  font-size: 14px;
                }
                .terms-section {
                  margin-top: 20px;
                  padding-top: 15px;
                  border-top: 1px solid #e2e8f0;
                }
                .terms-title {
                  font-weight: 700;
                  margin-bottom: 10px;
                  color: #1e40af;
                  font-size: 14px;
                }
                .terms-list {
                  list-style: none;
                  padding: 0;
                  margin: 0;
                }
                .terms-list li {
                  margin-bottom: 6px;
                  padding-left: 20px;
                  position: relative;
                  color: #64748b;
                  font-size: 12px;
                }
                .terms-list li:before {
                  content: "•";
                  position: absolute;
                  left: 0;
                  color: #2563eb;
                  font-weight: bold;
                  font-size: 16px;
                }
                .signature-section {
                  display: flex;
                  justify-content: space-between;
                  margin-top: 50px;
                  padding-top: 30px;
                  border-top: 2px solid #e2e8f0;
                  gap: 40px;
                }
                .signature-box {
                  flex: 1;
                  text-align: center;
                  padding: 20px;
                  background: #f8fafc;
                  border-radius: 8px;
                  border: 1px solid #e2e8f0;
                }
                .signature-label {
                  font-weight: 700;
                  margin-bottom: 50px;
                  color: #1e40af;
                  font-size: 14px;
                }
                .signature-line {
                  border-top: 2px solid #2563eb;
                  margin-top: 60px;
                  padding-top: 8px;
                  font-size: 12px;
                  color: #64748b;
                }
                @media print {
                  body {
                    padding: 0;
                    background: white;
                  }
                  .no-print {
                    display: none;
                  }
                  .bill-container {
                    box-shadow: none;
                    padding: 0;
                  }
                }
              </style>
            </head>
            <body>
              ${billRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">ไม่พบข้อมูลการเช่า</p>
          <Button onClick={() => router.back()} className="mt-4">
            กลับ
          </Button>
        </div>
      </div>
    );
  }

  // Calculate rental days
  const startDate = new Date(rental.startDate);
  const endDate = new Date(rental.endDate);
  const rentalDays =
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

  // Group assets by assetCode and productName to get detailed info
  const groupedAssets = new Map<
    string,
    {
      assetCode: string;
      productName?: string;
      count: number;
      dailyRate: number;
      insuranceFee: number;
      replacementPrice: number;
    }
  >();

  // Calculate daily rate per asset type
  const totalAssetsCount = rental.assets.reduce((sum, asset) => sum + (asset.quantity || 1), 0);
  const amountPerAsset = totalAssetsCount > 0 ? rental.dailyRate / totalAssetsCount : 0;

  rental.assets.forEach((asset) => {
    const quantity = asset.quantity || 1;
    const groupKey = `${asset.assetCode || "UNKNOWN"}_${asset.productName || "UNKNOWN"}`;

    if (groupedAssets.has(groupKey)) {
      const group = groupedAssets.get(groupKey)!;
      group.count += quantity;
    } else {
      // For now, we'll use proportional calculation
      // In a real scenario, you'd fetch the actual product data
      groupedAssets.set(groupKey, {
        assetCode: asset.assetCode || "UNKNOWN",
        productName: asset.productName,
        count: quantity,
        dailyRate: amountPerAsset,
        insuranceFee: 0, // Would need to fetch from product
        replacementPrice: 0, // Would need to fetch from product
      });
    }
  });

  // Calculate totals
  const totalDailyRental = rental.dailyRate;
  const totalRentalAmount = totalDailyRental * rentalDays;
  const totalDeposit = rental.deposit;
  const shippingCost = 0; // Not stored in rental, would need to add
  const grandTotal = totalRentalAmount + totalDeposit + shippingCost;

  // Format date for Thai calendar
  const formatThaiDate = (date: Date) => {
    const thaiMonths = [
      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",
      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",
      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค.",
    ];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = (date.getFullYear() + 543).toString().slice(-2);
    return `${day} ${month} ${year}`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Print Controls */}
        <div className="no-print mb-4 flex justify-between items-center">
          <Button variant="outline" onClick={() => router.back()}>
            <X className="h-4 w-4 mr-2" />
            กลับ
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            พิมพ์ใบเสร็จ
          </Button>
        </div>

        {/* Bill Content */}
        <div ref={billRef} className="bg-white p-8 shadow-xl rounded-lg border border-border/50">
          {/* Header Section */}
          <div className="header-section">
            <div className="company-logo">
              {ownerConfig.logo && ownerConfig.logo !== "/logo.png" && (
                <Image
                  src={ownerConfig.logo}
                  alt="Logo"
                  width={150}
                  height={80}
                  className="object-contain"
                  unoptimized
                />
              )}
            </div>
            <div className="company-info">
              <div className="company-name">{ownerConfig.name}</div>
              <div className="company-address">{ownerConfig.address}</div>
              <div className="company-phone">โทร. {ownerConfig.phone}</div>
            </div>
            <div className="document-title">
              <h1>ใบสัญญาเช่า/ใบรับเงิน/ใบส่งของ</h1>
            </div>
          </div>

          {/* Dates Section */}
          <div className="dates-section">
            <div className="date-field">
              <span className="date-label">วันที่เช่า</span>
              <span className="date-value">{formatThaiDate(startDate)}</span>
            </div>
            <div className="date-field">
              <span className="date-label">วันที่ครบกำหนด</span>
              <span className="date-value">{formatThaiDate(endDate)}</span>
            </div>
            <div className="date-field">
              <span className="date-label">โทร</span>
              <span className="date-value">{rental.customerPhone || "-"}</span>
            </div>
            <div className="date-field">
              <span className="date-label">จำนวนวันเช่า</span>
              <span className="date-value">{rentalDays}</span>
            </div>
          </div>

          {/* Customer Section */}
          <div className="customer-section">
            <div className="customer-label">นามลูกค้า</div>
            <div className="customer-name">{rental.customerName}</div>
          </div>

          {/* Combined Items and Summary Table */}
          <table
            className="items-table"
            style={{ border: "2px solid #000", borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th style={{ width: "5%", border: "1px solid #000" }}>ลำดับ</th>
                <th style={{ width: "25%", border: "1px solid #000" }}>รายการ</th>
                <th style={{ width: "8%", border: "1px solid #000" }}>หน่วย</th>
                <th style={{ width: "10%", border: "1px solid #000" }}>ค่าเช่า / วัน</th>
                <th style={{ width: "10%", border: "1px solid #000" }}>จำนวน ชิ้น</th>
                <th style={{ width: "12%", border: "1px solid #000" }}>จำนวนเงินค่าเช่าต่อวัน</th>
                <th style={{ width: "12%", border: "1px solid #000" }}>จำนวนเงินประกัน</th>
                <th style={{ width: "9%", border: "1px solid #000" }}>ค่าประกันต่อชิ้น</th>
                <th style={{ width: "9%", border: "1px solid #000" }}>กรณีเสียหาย</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(groupedAssets.values()).map((group, idx) => {
                const dailyRentalAmount = group.dailyRate * group.count;
                const depositAmount = group.insuranceFee * group.count;
                return (
                  <tr key={idx}>
                    <td
                      className="text-center"
                      style={{ fontWeight: "600", border: "1px solid #000" }}
                    >
                      {idx + 1}
                    </td>
                    <td style={{ fontWeight: "600", border: "1px solid #000" }}>
                      {group.productName || group.assetCode}
                    </td>
                    <td className="text-center" style={{ border: "1px solid #000" }}>
                      ชิ้น
                    </td>
                    <td className="text-right" style={{ border: "1px solid #000" }}>
                      {group.dailyRate.toFixed(2)}
                    </td>
                    <td
                      className="text-center"
                      style={{ fontWeight: "600", border: "1px solid #000" }}
                    >
                      {group.count}
                    </td>
                    <td
                      className="text-right"
                      style={{ fontWeight: "600", color: "#1e40af", border: "1px solid #000" }}
                    >
                      {dailyRentalAmount.toFixed(2)}
                    </td>
                    <td
                      className="text-right"
                      style={{ fontWeight: "600", color: "#1e40af", border: "1px solid #000" }}
                    >
                      {depositAmount > 0 ? depositAmount.toFixed(2) : ""}
                    </td>
                    <td className="text-right" style={{ border: "1px solid #000" }}>
                      {group.insuranceFee > 0 ? group.insuranceFee.toFixed(2) : ""}
                    </td>
                    <td className="text-right" style={{ border: "1px solid #000" }}>
                      {group.replacementPrice > 0 ? group.replacementPrice.toFixed(2) : ""}
                    </td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td
                  colSpan={5}
                  className="text-center"
                  style={{ fontWeight: "700", fontSize: "13px", border: "1px solid #000" }}
                >
                  รวมเงิน
                </td>
                <td
                  className="text-right"
                  style={{ fontWeight: "700", fontSize: "13px", border: "1px solid #000" }}
                >
                  {totalDailyRental.toFixed(2)}
                </td>
                <td
                  className="text-right"
                  style={{ fontWeight: "700", fontSize: "13px", border: "1px solid #000" }}
                >
                  {totalDeposit > 0 ? totalDeposit.toFixed(2) : ""}
                </td>
                <td colSpan={2} style={{ border: "1px solid #000" }}></td>
              </tr>
              {/* Summary rows */}
              <tr>
                <td colSpan={5} style={{ border: "1px solid #000", fontWeight: "600" }}>
                  เงินค่าเช่า
                </td>
                <td
                  colSpan={4}
                  style={{ border: "1px solid #000", textAlign: "right", fontWeight: "600" }}
                >
                  = {totalDailyRental.toFixed(2)} บาท / วัน
                </td>
              </tr>
              <tr>
                <td colSpan={5} style={{ border: "1px solid #000", fontWeight: "600" }}>
                  จำนวนวันที่เช่า
                </td>
                <td
                  colSpan={4}
                  style={{ border: "1px solid #000", textAlign: "right", fontWeight: "600" }}
                >
                  = {rentalDays} วัน
                </td>
              </tr>
              <tr>
                <td colSpan={5} style={{ border: "1px solid #000", fontWeight: "600" }}>
                  รวมเงินค่าเช่า
                </td>
                <td
                  colSpan={4}
                  style={{ border: "1px solid #000", textAlign: "right", fontWeight: "600" }}
                >
                  = {totalRentalAmount.toFixed(2)} บาท
                </td>
              </tr>
              <tr>
                <td colSpan={5} style={{ border: "1px solid #000", fontWeight: "600" }}>
                  รวมเงินประกัน
                </td>
                <td
                  colSpan={4}
                  style={{ border: "1px solid #000", textAlign: "right", fontWeight: "600" }}
                >
                  = {totalDeposit > 0 ? totalDeposit.toFixed(2) : "0.00"} บาท
                </td>
              </tr>
              <tr>
                <td colSpan={5} style={{ border: "1px solid #000", fontWeight: "600" }}>
                  ค่าขนส่งไป-กลับ
                </td>
                <td
                  colSpan={4}
                  style={{ border: "1px solid #000", textAlign: "right", fontWeight: "600" }}
                >
                  = {shippingCost > 0 ? shippingCost.toFixed(2) : ""} บาท
                </td>
              </tr>
              <tr className="total-row">
                <td
                  colSpan={5}
                  style={{
                    border: "1px solid #000",
                    background: "#bfdbfe",
                    fontWeight: "700",
                    fontSize: "16px",
                  }}
                >
                  รวมเงินทั้งสิ้น
                </td>
                <td
                  colSpan={4}
                  style={{
                    border: "1px solid #000",
                    background: "#bfdbfe",
                    textAlign: "right",
                    fontWeight: "700",
                    fontSize: "16px",
                    color: "#1e40af",
                  }}
                >
                  = {grandTotal.toFixed(2)} บาท
                </td>
              </tr>
            </tbody>
          </table>

          {/* Payment and Terms Section */}
          <div className="summary-section">
            <div className="payment-section">
              <div className="payment-title">ช่องทางการโอนเงิน</div>
              <div className="payment-info">
                <p style={{ marginBottom: "12px" }}>
                  <strong>{ownerConfig.bankName}</strong>
                </p>
                <p style={{ marginBottom: "6px" }}>
                  เลขที่บัญชี:{" "}
                  <strong style={{ color: "#1e40af" }}>{ownerConfig.bankAccount}</strong>
                </p>
                <p style={{ marginBottom: "6px" }}>
                  ชื่อบัญชี:{" "}
                  <strong style={{ color: "#1e40af" }}>{ownerConfig.bankAccountName}</strong>
                </p>
              </div>
              <div className="terms-section">
                <div className="terms-title">ข้อกำหนด:</div>
                <ul className="terms-list">
                  <li>ห้ามเจาะและดัดแปลงสินค้า</li>
                  <li>กรุณากองแบบให้เหมือนตอนไปส่ง</li>
                  <li>กรณีสินค้าเสียหายหรือสูญหาย จะคิดค่าชดเชยตามราคาที่กำหนด</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-label">ผู้เช่า/ผู้จ่ายเงิน</div>
              <div className="signature-line">
                (................................................) วันที่
                ............./............./..........
              </div>
            </div>
            <div className="signature-box">
              <div className="signature-label">ผู้ให้เช่า/ผู้ส่งของ/ผู้รับเงิน</div>
              <div className="signature-line">
                (................................................) วันที่
                ............./............./..........
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
