"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";
import { ownerConfig } from "@/lib/config/owner";
import { Button } from "@/components";
import { Printer, X, Loader2 } from "lucide-react";

interface RentalBillPageProps {
  params: Promise<{ id: string }>;
}

export default function RentalBillPage({ params }: RentalBillPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: rental, isLoading } = trpc.rental.getById.useQuery({ id });

  const formatThaiDate = (date: Date) => {
    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const handlePrint = () => {
    if (typeof window === "undefined" || !rental) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Calculate rental days
    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    const rentalDays =
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

    // Group assets
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

    const totalAssetsCount = rental.assets.reduce((sum, asset) => sum + (asset.quantity || 1), 0);
    const amountPerAsset = totalAssetsCount > 0 ? rental.dailyRate / totalAssetsCount : 0;

    rental.assets.forEach((asset) => {
      const quantity = asset.quantity || 1;
      const groupKey = `${asset.assetCode || "UNKNOWN"}_${asset.productName || "UNKNOWN"}`;

      if (groupedAssets.has(groupKey)) {
        const group = groupedAssets.get(groupKey)!;
        group.count += quantity;
      } else {
        groupedAssets.set(groupKey, {
          assetCode: asset.assetCode || "UNKNOWN",
          productName: asset.productName,
          count: quantity,
          dailyRate: amountPerAsset,
          insuranceFee: asset.insuranceFee ?? 0,
          replacementPrice: asset.replacementPrice ?? 0,
        });
      }
    });

    // Calculate totals
    const totalDailyRental = rental.dailyRate;
    const totalRentalAmount = totalDailyRental * rentalDays;
    const totalDeposit = rental.deposit;
    const shippingCost = rental.shippingCost ?? 0;
    const grandTotal = totalRentalAmount + totalDeposit + shippingCost;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ownerConfig</title>
          <style>
            @page { 
              size: A4; 
              margin: 1.5cm 1cm 1cm 1cm;
              @top-right {
                content: "หน้า " counter(page) "/" counter(pages);
                font-size: 12px;
                color: #475569;
                font-weight: 700;
                padding: 0;
              }
            }
            * { box-sizing: border-box; }
            body { font-family: 'Sarabun', 'Kanit', 'Prompt', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; color: #1a1a1a; }
            .bill-container { max-width: 210mm; margin: 0 auto; background: white; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #2563eb; }
            .company-logo { width: 140px; }
            .company-logo img { width: 100%; height: auto; object-fit: contain; border-radius: 4px; }
            .company-info { flex: 1; margin-left: 16px; padding-left: 16px; border-left: 2px solid #e5e7eb; }
            .company-name { font-size: 18px; font-weight: 700; color: #1e40af; margin-bottom: 6px; }
            .company-address { font-size: 13px; color: #4b5563; line-height: 1.5; }
            .company-phone { font-size: 14px; color: #1e40af; font-weight: 600; margin-top: 6px; }
            .document-title { text-align: right; color: #1e293b; position: relative; }
            .page-number-header {
              display: none;
              font-size: 12px;
              color: #475569;
              font-weight: 700;
              margin-bottom: 4px;
            }
            .document-title h1 { margin: 0; font-size: 20px; font-weight: 800; }
            .document-title p { margin: 4px 0 0 0; font-size: 13px; color: #475569; }
            .meta-section { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; }
            .meta-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .meta-value { font-size: 14px; font-weight: 600; color: #1e293b; }
            .customer-section { margin: 16px 0; padding: 12px; background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 8px; }
            .customer-label { font-weight: 700; color: #1e40af; margin-bottom: 6px; }
            .customer-value { font-size: 15px; font-weight: 600; color: #1e293b; }
            .items-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; border: 2px solid #000 !important; }
            .items-table th, .items-table td { border: 1px solid #000 !important; padding: 8px 6px; }
            .items-table th { background: #1e40af; color: white; text-align: center; font-weight: 700; }
            .items-table td { background: white; }
            .summary-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            .summary-table td { padding: 8px 10px; border: 1px solid #000; }
            .summary-table .label { font-weight: 600; color: #475569; }
            .summary-table .value { text-align: right; font-weight: 700; color: #1e293b; }
            .summary-table .total { background: #bfdbfe; color: #1e40af; font-size: 15px; }
            .page-break-wrapper {
              page-break-before: auto;
            }
            .payment-section { margin-top: 16px; padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
            .payment-title { font-weight: 700; color: #1e40af; border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin-bottom: 8px; font-size: 13px; }
            .payment-content { display: flex; align-items: center; gap: 12px; }
            .bank-logo { width: 60px; height: auto; object-fit: contain; }
            .payment-info { font-size: 11px; color: #475569; line-height: 1.5; flex: 1; }
            .payment-info strong { color: #1e40af; font-size: 11px; }
            .payment-info p { margin: 2px 0; }
            .signature-section { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
            .signature-box { text-align: center; }
            .signature-label { font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 60px; }
            .signature-line { border-top: 2px solid #1e293b; margin: 0 auto; width: 200px; margin-top: 60px; }
            .signature-name { font-size: 13px; color: #64748b; margin-top: 8px; }
            .footer { margin-top: 28px; text-align: center; color: #64748b; font-size: 12px; }
            @media print { 
              body { padding: 0; background: white; } 
              .no-print { display: none; } 
              .bill-container { box-shadow: none; }
              .page-number-header {
                display: block;
                position: absolute;
                top: -1.2cm;
                right: 0;
                font-size: 12px;
                color: #475569;
                font-weight: 700;
              }
              .header-section {
                position: relative;
                margin-top: 1.5cm;
              }
              .page-break-wrapper {
                page-break-before: always;
                padding-top: 2cm;
              }
              .payment-section {
                margin-top: 0;
              }
              .signature-section {
                page-break-inside: avoid;
              }
              .footer {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="bill-container">
            <div class="header-section">
              <div class="company-logo">
                ${ownerConfig.logo ? `<img src="${ownerConfig.logo}" alt="Logo" />` : ""}
              </div>
              <div class="company-info">
                <div class="company-name">${ownerConfig.name}</div>
                <div class="company-address">${ownerConfig.address}</div>
                <div class="company-phone">โทร. ${ownerConfig.phone}</div>
              </div>
              <div class="document-title">
                <div class="page-number-header">หน้า <span class="current-page"></span>/<span class="total-pages">1</span></div>
                <h1>ใบสัญญาเช่า/ใบรับเงิน/ใบส่งของ</h1>
                <p>Rental Bill</p>
              </div>
            </div>

            <div class="meta-section">
              <div>
                <div class="meta-label">เลขที่สัญญา</div>
                <div class="meta-value">${rental.rentalNumber || "-"}</div>
              </div>
              <div>
                <div class="meta-label">วันที่เช่า</div>
                <div class="meta-value">${formatThaiDate(startDate)}</div>
              </div>
              <div>
                <div class="meta-label">วันที่ครบกำหนด</div>
                <div class="meta-value">${formatThaiDate(endDate)}</div>
              </div>
              <div>
                <div class="meta-label">จำนวนวันเช่า</div>
                <div class="meta-value">${rentalDays} วัน</div>
              </div>
            </div>

            <div class="customer-section">
              <div class="customer-label">ชื่อลูกค้า</div>
              <div class="customer-value">${rental.customerName || "-"}</div>
              ${rental.customerPhone ? `<div class="customer-value" style="font-weight:500;">โทร. ${rental.customerPhone}</div>` : ""}
              ${rental.customerAddress ? `<div style="font-size:13px; color:#475569; margin-top:4px;">${rental.customerAddress}</div>` : ""}
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width:5%;">ลำดับ</th>
                  <th style="width:25%;">รายการ</th>
                  <th style="width:10%;">รหัสสินค้า</th>
                  <th style="width:8%;">จำนวน</th>
                  <th style="width:12%;">ค่าเช่า/วัน</th>
                  <th style="width:12%;">จำนวนเงิน</th>
                  <th style="width:12%;">เงินประกัน</th>
                  <th style="width:16%;">กรณีเสียหาย</th>
                </tr>
              </thead>
              <tbody>
                ${Array.from(groupedAssets.values())
                  .map((group, idx) => {
                    const dailyRentalAmount = group.dailyRate * group.count;
                    return `
                    <tr>
                      <td style="text-align:center; font-weight:600;">${idx + 1}</td>
                      <td style="font-weight:600;">${group.productName || group.assetCode || "-"}</td>
                      <td style="text-align:center;">${group.assetCode || "-"}</td>
                      <td style="text-align:center;">${group.count}</td>
                      <td style="text-align:right;">${group.dailyRate.toFixed(2)} ฿</td>
                      <td style="text-align:right; font-weight:700; color:#1e40af;">${dailyRentalAmount.toFixed(2)} ฿</td>
                      <td style="text-align:right;">${group.insuranceFee > 0 ? (group.insuranceFee * group.count).toFixed(2) : "-"} ฿</td>
                      <td style="text-align:right;">${group.replacementPrice > 0 ? (group.replacementPrice * group.count).toFixed(2) : "-"} ฿</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>

            <table class="summary-table">
              <tbody>
                <tr>
                  <td class="label" style="width:60%;">เงินค่าเช่า/วัน</td>
                  <td class="value" style="width:40%;">${totalDailyRental.toLocaleString()} ฿</td>
                </tr>
                <tr>
                  <td class="label">จำนวนวันที่เช่า</td>
                  <td class="value">${rentalDays} วัน</td>
                </tr>
                <tr>
                  <td class="label">รวมเงินค่าเช่า</td>
                  <td class="value">${totalRentalAmount.toLocaleString()} ฿</td>
                </tr>
                ${
                  totalDeposit > 0
                    ? `
                  <tr>
                    <td class="label">เงินประกัน</td>
                    <td class="value">${totalDeposit.toLocaleString()} ฿</td>
                  </tr>
                `
                    : ""
                }
                ${
                  shippingCost > 0
                    ? `
                  <tr>
                    <td class="label">ค่าขนส่งไป-กลับ</td>
                    <td class="value">${shippingCost.toLocaleString()} ฿</td>
                  </tr>
                `
                    : ""
                }
                <tr class="total">
                  <td class="label">รวมเงินทั้งสิ้น</td>
                  <td class="value">${grandTotal.toLocaleString()} ฿</td>
                </tr>
              </tbody>
            </table>

            <div class="page-break-wrapper">
              <div class="payment-section">
                <div class="payment-title">ช่องทางการชำระเงิน</div>
                <div class="payment-content">
                  <img src="/bank-logo.png" alt="Bank Logo" class="bank-logo" />
                  <div class="payment-info">
                    <p><strong>${ownerConfig.bankName}</strong></p>
                    <p>${ownerConfig.bankBranch || ""}</p>
                    <p>เลขที่บัญชี: <strong>${ownerConfig.bankAccount}</strong></p>
                    <p>ชื่อบัญชี: <strong>${ownerConfig.bankAccountName}</strong></p>
                  </div>
                </div>
              </div>

              <div class="signature-section">
                <div class="signature-box">
                  <div class="signature-label">ลายมือชื่อลูกค้า</div>
                  <div class="signature-line"></div>
                  <div class="signature-name">(${rental.customerName || ""})</div>
                </div>
                <div class="signature-box">
                  <div class="signature-label">ลายมือชื่อผู้ขาย</div>
                  <div class="signature-line"></div>
                  <div class="signature-name">(${ownerConfig.bankAccountName || ""})</div>
                </div>
              </div>

              <div class="footer">
                <p>ขอบคุณที่ใช้บริการ</p>
              </div>
            </div>
          </div>
          <script>
            (function() {
              function updatePageNumbers() {
                // A4 page height: 29.7cm = 1123px at 96 DPI
                // Account for margins: 1.5cm top + 1cm bottom = 2.5cm = 95px
                const pageHeight = 1028; // 1123 - 95 (margins)
                const body = document.body;
                const html = document.documentElement;
                const height = Math.max(
                  body.scrollHeight,
                  body.offsetHeight,
                  html.clientHeight,
                  html.scrollHeight,
                  html.offsetHeight
                );
                const totalPages = Math.max(1, Math.ceil(height / pageHeight));
                
                // Update total pages
                const totalPagesElements = document.querySelectorAll('.total-pages');
                totalPagesElements.forEach(el => {
                  el.textContent = totalPages;
                });
              }
              
              // Update on load
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                  setTimeout(updatePageNumbers, 100);
                });
              } else {
                setTimeout(updatePageNumbers, 100);
              }
              
              // Update before print
              window.addEventListener('beforeprint', function() {
                setTimeout(updatePageNumbers, 50);
              });
            })();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
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

  // Group assets
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

  const totalAssetsCount = rental.assets.reduce((sum, asset) => sum + (asset.quantity || 1), 0);
  const amountPerAsset = totalAssetsCount > 0 ? rental.dailyRate / totalAssetsCount : 0;

  rental.assets.forEach((asset) => {
    const quantity = asset.quantity || 1;
    const groupKey = `${asset.assetCode || "UNKNOWN"}_${asset.productName || "UNKNOWN"}`;

    if (groupedAssets.has(groupKey)) {
      const group = groupedAssets.get(groupKey)!;
      group.count += quantity;
    } else {
      groupedAssets.set(groupKey, {
        assetCode: asset.assetCode || "UNKNOWN",
        productName: asset.productName,
        count: quantity,
        dailyRate: amountPerAsset,
        insuranceFee: asset.insuranceFee ?? 0,
        replacementPrice: asset.replacementPrice ?? 0,
      });
    }
  });

  // Calculate totals
  const totalDailyRental = rental.dailyRate;
  const totalRentalAmount = totalDailyRental * rentalDays;
  const totalDeposit = rental.deposit;
  const shippingCost = rental.shippingCost ?? 0;
  const grandTotal = totalRentalAmount + totalDeposit + shippingCost;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="no-print mb-4 flex justify-between items-center">
          <Button variant="outline" onClick={() => router.back()}>
            <X className="h-4 w-4 mr-2" />
            กลับ
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            พิมพ์บิล
          </Button>
        </div>

        <div className="bg-white p-8 shadow-xl rounded-lg border border-border/50">
          <div className="flex justify-between items-start border-b border-border pb-4 mb-4">
            <div className="flex items-start gap-4">
              {ownerConfig.logo && (
                <div className="w-32">
                  <Image
                    src={ownerConfig.logo}
                    alt="Logo"
                    width={128}
                    height={80}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
              <div>
                <div className="text-xl font-bold text-foreground">{ownerConfig.name}</div>
                <div className="text-sm text-muted-foreground leading-6">{ownerConfig.address}</div>
                <div className="text-sm font-semibold text-primary mt-1">
                  โทร. {ownerConfig.phone}
                </div>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-extrabold text-foreground">
                ใบสัญญาเช่า/ใบรับเงิน/ใบส่งของ
              </h1>
              <p className="text-sm text-muted-foreground">Rental Bill</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 bg-muted/40 border border-border rounded-lg p-3 mb-4">
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase">
                เลขที่สัญญา
              </div>
              <div className="text-sm font-semibold text-foreground">{rental.rentalNumber}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase">
                วันที่เช่า
              </div>
              <div className="text-sm font-semibold text-foreground">
                {formatThaiDate(startDate)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase">
                วันที่ครบกำหนด
              </div>
              <div className="text-sm font-semibold text-foreground">{formatThaiDate(endDate)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase">
                จำนวนวันเช่า
              </div>
              <div className="text-sm font-semibold text-foreground">{rentalDays} วัน</div>
            </div>
          </div>

          <div className="bg-muted/30 border-l-4 border-primary rounded-lg p-3 mb-4">
            <div className="text-primary font-bold mb-1">ชื่อลูกค้า</div>
            <div className="text-base font-semibold text-foreground">{rental.customerName}</div>
            {rental.customerPhone && (
              <div className="text-sm text-muted-foreground mt-1">โทร. {rental.customerPhone}</div>
            )}
            {rental.customerAddress && (
              <div className="text-sm text-muted-foreground mt-1">{rental.customerAddress}</div>
            )}
          </div>

          <div className="overflow-hidden border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="p-2 text-center w-[5%]">ลำดับ</th>
                  <th className="p-2 text-left w-[25%]">รายการ</th>
                  <th className="p-2 text-center w-[10%]">รหัสสินค้า</th>
                  <th className="p-2 text-center w-[8%]">จำนวน</th>
                  <th className="p-2 text-right w-[12%]">ค่าเช่า/วัน</th>
                  <th className="p-2 text-right w-[12%]">จำนวนเงิน</th>
                  <th className="p-2 text-right w-[12%]">เงินประกัน</th>
                  <th className="p-2 text-right w-[16%]">กรณีเสียหาย</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(groupedAssets.values()).map((group, idx) => {
                  const dailyRentalAmount = group.dailyRate * group.count;
                  return (
                    <tr key={idx} className="border-t border-border">
                      <td className="p-2 text-center font-semibold">{idx + 1}</td>
                      <td className="p-2 font-semibold text-foreground">
                        {group.productName || group.assetCode || "-"}
                      </td>
                      <td className="p-2 text-center">{group.assetCode || "-"}</td>
                      <td className="p-2 text-center">{group.count}</td>
                      <td className="p-2 text-right">{group.dailyRate.toFixed(2)} ฿</td>
                      <td className="p-2 text-right font-bold text-primary">
                        {dailyRentalAmount.toFixed(2)} ฿
                      </td>
                      <td className="p-2 text-right">
                        {group.insuranceFee > 0
                          ? (group.insuranceFee * group.count).toFixed(2)
                          : "-"}{" "}
                        ฿
                      </td>
                      <td className="p-2 text-right">
                        {group.replacementPrice > 0
                          ? (group.replacementPrice * group.count).toFixed(2)
                          : "-"}{" "}
                        ฿
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="border border-border rounded-lg p-3 bg-muted/20">
                <div className="font-bold text-primary mb-2">ช่องทางการชำระเงิน</div>
                <div className="flex items-center gap-3">
                  <Image
                    src="/bank-logo.png"
                    alt="Bank Logo"
                    width={80}
                    height={50}
                    className="object-contain"
                    unoptimized
                  />
                  <div className="text-sm text-muted-foreground leading-6 flex-1">
                    <div>
                      <strong className="text-primary">{ownerConfig.bankName}</strong>
                    </div>
                    {ownerConfig.bankBranch && <div>{ownerConfig.bankBranch}</div>}
                    <div>
                      เลขที่บัญชี:{" "}
                      <strong className="text-primary">{ownerConfig.bankAccount}</strong>
                    </div>
                    <div>
                      ชื่อบัญชี:{" "}
                      <strong className="text-primary">{ownerConfig.bankAccountName}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="p-2 font-semibold text-muted-foreground">เงินค่าเช่า/วัน</td>
                    <td className="p-2 text-right font-semibold">
                      {totalDailyRental.toLocaleString()} ฿
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-muted-foreground">จำนวนวันที่เช่า</td>
                    <td className="p-2 text-right font-semibold">{rentalDays} วัน</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-muted-foreground">รวมเงินค่าเช่า</td>
                    <td className="p-2 text-right font-semibold">
                      {totalRentalAmount.toLocaleString()} ฿
                    </td>
                  </tr>
                  {totalDeposit > 0 && (
                    <tr>
                      <td className="p-2 font-semibold text-muted-foreground">เงินประกัน</td>
                      <td className="p-2 text-right font-semibold">
                        {totalDeposit.toLocaleString()} ฿
                      </td>
                    </tr>
                  )}
                  {shippingCost > 0 && (
                    <tr>
                      <td className="p-2 font-semibold text-muted-foreground">ค่าขนส่งไป-กลับ</td>
                      <td className="p-2 text-right font-semibold">
                        {shippingCost.toLocaleString()} ฿
                      </td>
                    </tr>
                  )}
                  <tr className="bg-muted/40">
                    <td className="p-2 font-bold text-foreground">รวมเงินทั้งสิ้น</td>
                    <td className="p-2 text-right font-bold text-primary">
                      {grandTotal.toLocaleString()} ฿
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t-2 border-border grid grid-cols-2 gap-10">
            <div className="text-center">
              <div className="text-sm font-semibold text-muted-foreground mb-16">
                ลายมือชื่อลูกค้า
              </div>
              <div className="border-t-2 border-foreground w-48 mx-auto mt-16"></div>
              <div className="text-xs text-muted-foreground mt-2">
                ({rental.customerName || ""})
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-muted-foreground mb-16">
                ลายมือชื่อผู้ขาย
              </div>
              <div className="border-t-2 border-foreground w-48 mx-auto mt-16"></div>
              <div className="text-xs text-muted-foreground mt-2">
                ({ownerConfig.bankAccountName || ""})
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground mt-6">ขอบคุณที่ใช้บริการ</div>
        </div>
      </div>
    </div>
  );
}
