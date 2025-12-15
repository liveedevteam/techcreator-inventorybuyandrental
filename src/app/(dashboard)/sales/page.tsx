"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/client";
import {
  PageHeader,
  SectionCard,
  Button,
  Badge,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
} from "@/components";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Receipt,
  Printer,
  Eye,
  Check,
  XCircle,
} from "lucide-react";
import { createSaleSchema, updateSaleSchema } from "@/lib/trpc/schemas";
import type { CreateSaleInput, UpdateSaleInput, SaleItem } from "@/lib/trpc/schemas";
import { useTranslation } from "@/lib/hooks/useTranslation";

export default function SalesPage() {
  const t = useTranslation();
  const notify = (title: string, description?: string) => {
    if (typeof window !== "undefined") {
      window.alert(description ? `${title}\n${description}` : title);
    } else {
      console.log(title, description);
    }
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBillPreviewOpen, setIsBillPreviewOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<{ id: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewSaleId, setPreviewSaleId] = useState<string | null>(null);
  const [paymentEditSale, setPaymentEditSale] = useState<{
    id: string;
    totalAmount: number;
    paidAmount: number;
    deposit: number;
    paymentStatus: "pending" | "paid" | "partial";
  } | null>(null);
  const billRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "completed" | "cancelled" | "all">(
    "all"
  );
  const [paymentStatusFilter] = useState<"pending" | "paid" | "partial" | "all">("all");

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.sale.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    paymentStatus: paymentStatusFilter !== "all" ? paymentStatusFilter : undefined,
    page: 1,
    limit: 50,
  });

  const { data: saleDetail } = trpc.sale.getById.useQuery(
    { id: previewSaleId! },
    { enabled: !!previewSaleId }
  );

  // ============================================================================
  // Data Sources for Product Dropdown
  // ============================================================================
  // 1. Products: Fetches all buy-type products (limit 100 max)
  // 2. BuyStock: Fetches all stock entries (limit 100 max)
  // 3. Matching: Products are matched with stock by productId
  //    - If no stock entry exists for a product, quantity shows as 0
  //    - Stock entries must be created manually via the Buy Stock page
  // ============================================================================

  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = trpc.product.list.useQuery({
    stockType: "buy",
    page: 1,
    limit: 100,
  });

  // Fetch all buy stock items (no filters) to match with products
  // This ensures we have complete stock data for the product dropdown
  const { data: buyStockList, error: stocksError } = trpc.buyStock.list.useQuery({
    page: 1,
    limit: 100, // Maximum allowed - fetch all stock items
    // No search or lowStockOnly filters - we need all stock for matching
  });

  const createMutation = trpc.sale.create.useMutation({
    onSuccess: () => {
      utils.sale.list.invalidate();
      closeModal();
      notify("สร้างการขายสำเร็จ");
    },
    onError: (err) => {
      notify("ไม่สามารถสร้างการขายได้", err.message);
    },
  });

  const updateMutation = trpc.sale.update.useMutation({
    onSuccess: () => {
      utils.sale.list.invalidate();
      closeModal();
      notify("อัปเดตการขายสำเร็จ");
    },
    onError: (err) => {
      notify("ไม่สามารถอัปเดตการขายได้", err.message);
    },
  });

  const updateStatusMutation = trpc.sale.updateStatus.useMutation({
    onSuccess: (updatedSale) => {
      // Optimistically update the visible list so status flips to "เสร็จสิ้น" immediately
      utils.sale.list.setData(
        {
          status: statusFilter !== "all" ? statusFilter : undefined,
          paymentStatus: paymentStatusFilter !== "all" ? paymentStatusFilter : undefined,
          page: 1,
          limit: 50,
        },
        (old) =>
          old
            ? {
                ...old,
                sales: old.sales.map((sale) =>
                  sale.id === updatedSale.id ? { ...sale, status: updatedSale.status } : sale
                ),
              }
            : old
      );

      utils.sale.getById.setData({ id: updatedSale.id }, updatedSale);
      utils.sale.list.invalidate();
      utils.buyStock.list.invalidate();
      notify("อัปเดตสถานะสำเร็จ");
    },
    onError: (err) => {
      notify("อัปเดตสถานะไม่สำเร็จ", err.message);
    },
  });

  const deleteMutation = trpc.sale.delete.useMutation({
    onSuccess: () => {
      utils.sale.list.invalidate();
      setDeleteConfirmId(null);
      notify("ลบการขายสำเร็จ");
    },
    onError: (err) => {
      notify("ไม่สามารถลบการขายได้", err.message);
    },
  });

  const paymentStatusOptions: Array<{ value: "pending" | "paid" | "partial"; label: string }> = [
    { value: "pending", label: "รอชำระ" },
    { value: "paid", label: "ชำระแล้ว" },
    { value: "partial", label: "ชำระบางส่วน" },
  ];

  // Debug logging for product-buyStock relationship
  useEffect(() => {
    if (products?.products && buyStockList?.stocks) {
      console.log("Products:", products.products);
      console.log("BuyStock:", buyStockList.stocks);
      console.log(
        "Product IDs:",
        products.products.map((p) => p.id)
      );
      console.log(
        "Stock Product IDs:",
        buyStockList.stocks.map((s) => s.productId)
      );
    }
    if (productsError) {
      console.error("Products query error:", productsError);
    }
    if (stocksError) {
      console.error("BuyStock query error:", stocksError);
    }
  }, [products, buyStockList, productsError, stocksError]);

  const form = useForm<CreateSaleInput | UpdateSaleInput>({
    resolver: zodResolver(editingSale ? updateSaleSchema : createSaleSchema) as unknown as Resolver<
      CreateSaleInput | UpdateSaleInput
    >,
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      items: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      totalAmount: 0,
      deposit: 0,
      paymentMethod: "cash",
      paymentStatus: "pending",
      paidAmount: 0,
      notes: "",
    },
  });

  const items = form.watch("items") || [];
  const discount = form.watch("discount") || 0;
  const tax = form.watch("tax") || 0;
  const paymentStatus = form.watch("paymentStatus");
  const totalAmountValue = form.watch("totalAmount") || 0;

  const formatCurrency = (value: number | undefined) =>
    (value ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Calculate totals using the latest form values (avoids stale closures)
  const calculateTotals = () => {
    const currentItems = form.getValues("items") || [];
    const currentDiscount = form.getValues("discount") ?? 0;
    const currentTax = form.getValues("tax") ?? 0;

    const itemsTotal = currentItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const calculatedSubtotal = itemsTotal;
    const calculatedTotal = calculatedSubtotal - currentDiscount + currentTax;

    form.setValue("subtotal", calculatedSubtotal);
    form.setValue("totalAmount", calculatedTotal);
  };

  // Keep paidAmount aligned with paymentStatus selection
  useEffect(() => {
    if (!paymentStatus) return;
    if (paymentStatus === "pending") {
      form.setValue("paidAmount", 0);
    } else if (paymentStatus === "paid") {
      form.setValue("paidAmount", totalAmountValue);
    }
  }, [paymentStatus, totalAmountValue, form]);

  const openCreateModal = () => {
    setEditingSale(null);
    form.reset({
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      items: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      totalAmount: 0,
      deposit: 0,
      paymentMethod: "cash",
      paymentStatus: "pending",
      paidAmount: 0,
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sale: {
    id: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    items: Array<{
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    subtotal: number;
    discount: number;
    tax: number;
    totalAmount: number;
    deposit: number;
    paymentMethod?: "cash" | "card" | "transfer" | "other";
    paymentStatus: "pending" | "paid" | "partial";
    paidAmount: number;
    notes?: string;
  }) => {
    setEditingSale({ id: sale.id });
    form.reset({
      customerName: sale.customerName,
      customerPhone: sale.customerPhone || "",
      customerEmail: sale.customerEmail || "",
      customerAddress: sale.customerAddress || "",
      items: sale.items,
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      totalAmount: sale.totalAmount,
      deposit: sale.deposit ?? 0,
      paymentMethod: sale.paymentMethod || "cash",
      paymentStatus: sale.paymentStatus as "pending" | "paid" | "partial",
      paidAmount: sale.paidAmount,
      notes: sale.notes || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSale(null);
    form.reset();
  };

  const onSubmit = (data: CreateSaleInput | UpdateSaleInput) => {
    // Ensure deposit is a number (already parsed in input onChange, but safety check)
    const processedData = {
      ...data,
      deposit:
        typeof data.deposit === "string" ? parseFloat(data.deposit) || 0 : (data.deposit ?? 0),
    };

    if (editingSale) {
      updateMutation.mutate({ id: editingSale.id, ...processedData } as UpdateSaleInput);
    } else {
      createMutation.mutate(processedData as CreateSaleInput);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const handleComplete = (id: string) => {
    updateStatusMutation.mutate({ id, status: "completed" });
  };

  const handleCancel = (id: string) => {
    updateStatusMutation.mutate({ id, status: "cancelled" });
  };

  const openPaymentEdit = (sale: {
    id: string;
    totalAmount: number;
    paidAmount: number;
    deposit: number;
    paymentStatus: "pending" | "paid" | "partial";
  }) => {
    setPaymentEditSale({
      id: sale.id,
      totalAmount: sale.totalAmount,
      paidAmount: sale.paidAmount ?? 0,
      deposit: sale.deposit ?? 0,
      paymentStatus: sale.paymentStatus,
    });
  };

  const closePaymentEdit = () => setPaymentEditSale(null);

  const savePaymentEdit = () => {
    if (!paymentEditSale) return;
    const paidAmount =
      paymentEditSale.paymentStatus === "paid"
        ? paymentEditSale.totalAmount
        : paymentEditSale.paidAmount;
    updateMutation.mutate(
      {
        id: paymentEditSale.id,
        paymentStatus: paymentEditSale.paymentStatus,
        paidAmount,
        deposit: paymentEditSale.deposit ?? 0,
      },
      {
        onSuccess: () => {
          closePaymentEdit();
        },
      }
    );
  };

  const openBillPreview = (saleId: string) => {
    setPreviewSaleId(saleId);
    setIsBillPreviewOpen(true);
  };

  const closeBillPreview = () => {
    setIsBillPreviewOpen(false);
    setPreviewSaleId(null);
  };

  const printBill = () => {
    if (billRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Bill ${saleDetail?.billNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .bill-header { text-align: center; margin-bottom: 30px; }
                .bill-info { margin-bottom: 20px; }
                .bill-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .bill-items th, .bill-items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .bill-items th { background-color: #f2f2f2; }
                .bill-totals { text-align: right; margin-top: 20px; }
                .bill-footer { margin-top: 40px; text-align: center; }
                @media print { body { padding: 0; } }
              </style>
            </head>
            <body>
              ${billRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const addItem = () => {
    const currentItems = form.getValues("items") || [];
    form.setValue("items", [
      ...currentItems,
      {
        productId: "",
        productName: "",
        sku: "",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues("items") || [];
    form.setValue(
      "items",
      currentItems.filter((_, i) => i !== index)
    );
    calculateTotals();
  };

  const updateItem = (index: number, field: keyof SaleItem, value: string | number) => {
    const currentItems = form.getValues("items") || [];
    const updatedItems = [...currentItems];

    if (field === "productId" && typeof value === "string") {
      const product = products?.products.find((p) => p.id === value);
      if (product) {
        updatedItems[index] = {
          ...updatedItems[index],
          productId: value as string,
          productName: product.name,
          sku: product.sku,
          unitPrice: product.price || 0,
          quantity: 1,
          totalPrice: product.price || 0,
        };
      }
    } else if (field === "quantity" || field === "unitPrice") {
      // Ensure numeric arithmetic uses the incoming value, not stale state
      const currentItem = updatedItems[index];
      const newQuantity = field === "quantity" ? Number(value) || 0 : currentItem.quantity;
      const newUnitPrice = field === "unitPrice" ? Number(value) || 0 : currentItem.unitPrice;

      updatedItems[index] = {
        ...currentItem,
        quantity: newQuantity,
        unitPrice: newUnitPrice,
        totalPrice: newQuantity * newUnitPrice,
      };
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
    }

    form.setValue("items", updatedItems);
    calculateTotals();
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; color: "blue" | "success" | "error" | "warning" }
    > = {
      pending: { label: t.sale.statusPending, color: "warning" },
      completed: { label: t.sale.statusCompleted, color: "success" },
      cancelled: { label: t.sale.statusCancelled, color: "error" },
    };
    const statusInfo = statusMap[status] || { label: status, color: "blue" };
    return (
      <Badge variant="status" color={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; color: "blue" | "success" | "error" | "warning" }
    > = {
      pending: { label: t.sale.paymentStatusPending, color: "warning" },
      paid: { label: t.sale.paymentStatusPaid, color: "success" },
      partial: { label: t.sale.paymentStatusPartial, color: "blue" },
    };
    const statusInfo = statusMap[status] || { label: status, color: "blue" };
    return (
      <Badge variant="status" color={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <>
      <PageHeader title={t.nav.sales} description="จัดการการขายและออกบิล">
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          {t.sale.create}
        </Button>
      </PageHeader>

      <div className="p-6 space-y-6">
        <SectionCard title={t.sale.title} icon={Receipt}>
          <div className="mb-4 flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              ทั้งหมด
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
            >
              {t.sale.statusPending}
            </Button>
            <Button
              variant={statusFilter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("completed")}
            >
              {t.sale.statusCompleted}
            </Button>
            <Button
              variant={statusFilter === "cancelled" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("cancelled")}
            >
              {t.sale.statusCancelled}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.sale.billNumber}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.sale.customerName}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.sale.totalAmount}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      ชำระแล้ว
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.sale.paymentStatus}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.sale.status}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.common.date}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.common.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.sales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3 text-sm font-medium text-foreground">{sale.billNumber}</td>
                      <td className="p-3 text-sm text-foreground">{sale.customerName}</td>
                      <td className="p-3 text-sm text-foreground">
                        {sale.totalAmount.toLocaleString()} ฿
                      </td>
                      <td className="p-3 text-sm text-foreground">
                        {`${formatCurrency(sale.paidAmount)} ฿`}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getPaymentStatusBadge(sale.paymentStatus)}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            onClick={() =>
                              openPaymentEdit({
                                id: sale.id,
                                totalAmount: sale.totalAmount,
                                paidAmount: sale.paidAmount,
                                deposit: sale.deposit ?? 0,
                                paymentStatus: sale.paymentStatus as "pending" | "paid" | "partial",
                              })
                            }
                            title="แก้ไขการชำระเงิน"
                            aria-label="แก้ไขการชำระเงิน"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-3">{getStatusBadge(sale.status)}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleDateString("th-TH")}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/sales/${sale.id}/bill`, "_blank")}
                            title="พิมพ์บิล"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openBillPreview(sale.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {sale.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  openEditModal({
                                    ...sale,
                                    paymentMethod:
                                      (sale.paymentMethod as
                                        | "cash"
                                        | "card"
                                        | "transfer"
                                        | "other"
                                        | undefined) || "cash",
                                    paymentStatus: sale.paymentStatus as
                                      | "pending"
                                      | "paid"
                                      | "partial",
                                  })
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleComplete(sale.id)}
                                title="เสร็จสิ้น"
                                aria-label="เสร็จสิ้น"
                              >
                                <Check className="h-4 w-4 text-success" />
                              </Button>
                            </>
                          )}
                          {sale.status === "completed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(sale.id)}
                              title={t.sale.cancel}
                            >
                              <XCircle className="h-4 w-4 text-error" />
                            </Button>
                          )}
                          {sale.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(sale.id)}
                            >
                              <Trash2 className="h-4 w-4 text-error" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">
                {editingSale ? t.sale.edit : t.sale.create}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sale.customerName}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sale.customerPhone}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sale.customerEmail}</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sale.paymentMethod}</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground"
                          >
                            <option value="cash">{t.sale.paymentMethodCash}</option>
                            <option value="card">{t.sale.paymentMethodCard}</option>
                            <option value="transfer">{t.sale.paymentMethodTransfer}</option>
                            <option value="other">{t.sale.paymentMethodOther}</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>สถานะการชำระเงิน</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground font-semibold"
                          >
                            <option value="pending">รอชำระ</option>
                            <option value="paid">ชำระแล้ว</option>
                            <option value="partial">ชำระบางส่วน</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>เงินมัดจำ</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            value={field.value?.toString() || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow empty string or valid number input (including decimals)
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                // Parse to number immediately but allow empty string for better UX
                                const numValue = value === "" ? 0 : parseFloat(value) || 0;
                                field.onChange(numValue);
                              }
                            }}
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.sale.customerAddress}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <FormLabel>{t.sale.items}</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t.sale.addItem}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 items-end p-3 border border-border rounded"
                      >
                        <div className="col-span-4">
                          <label className="text-sm text-muted-foreground mb-1 block">
                            {t.sale.selectProduct}
                          </label>
                          <select
                            value={item.productId}
                            onChange={(e) => updateItem(index, "productId", e.target.value)}
                            className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground"
                            disabled={!!editingSale}
                          >
                            <option value="">เลือกสินค้า</option>
                            {productsLoading ? (
                              <option disabled>กำลังโหลดสินค้า...</option>
                            ) : productsError ? (
                              <option disabled>
                                เกิดข้อผิดพลาด: {productsError.message || "ไม่สามารถโหลดสินค้าได้"}
                              </option>
                            ) : products?.products?.length === 0 ? (
                              <option disabled>ไม่พบสินค้าประเภทซื้อ</option>
                            ) : (
                              products?.products?.map((product) => {
                                const stock = buyStockList?.stocks?.find(
                                  (s) => s.productId === product.id
                                );
                                const stockQuantity = stock?.quantity ?? 0;
                                const isOutOfStock = stockQuantity === 0;
                                return (
                                  <option
                                    key={product.id}
                                    value={product.id}
                                    disabled={isOutOfStock}
                                  >
                                    {product.name} ({product.sku}) - สต็อก: {stockQuantity}{" "}
                                    {product.unit || ""}
                                    {isOutOfStock ? " [หมด]" : ""}
                                  </option>
                                );
                              })
                            )}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm text-muted-foreground mb-1 block">
                            {t.sale.quantity}
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", parseInt(e.target.value) || 1)
                            }
                            disabled={!!editingSale}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm text-muted-foreground mb-1 block">
                            {t.sale.unitPrice}
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm text-muted-foreground mb-1 block">
                            {t.sale.totalPrice}
                          </label>
                          <Input
                            type="number"
                            value={item.totalPrice.toFixed(2)}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="col-span-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={!!editingSale}
                          >
                            <Trash2 className="h-4 w-4 text-error" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="subtotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sale.subtotal}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              calculateTotals();
                            }}
                            disabled
                            className="bg-muted"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sale.discount}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              calculateTotals();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sale.tax}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              calculateTotals();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="totalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sale.totalAmount}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value}
                            disabled
                            className="bg-muted font-bold"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paidAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sale.paidAmount}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            disabled={paymentStatus === "pending"}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.common.notes}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeModal}>
                    {t.common.cancel}
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {t.common.save}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}

      {/* Bill Preview Modal */}
      {isBillPreviewOpen && saleDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">{t.sale.previewBill}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={printBill}>
                  <Printer className="h-4 w-4 mr-2" />
                  {t.sale.printBill}
                </Button>
                <Button variant="ghost" size="sm" onClick={closeBillPreview}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div ref={billRef} className="space-y-4">
              <div className="bill-header">
                <h1 className="text-2xl font-bold text-foreground">ใบเสร็จรับเงิน</h1>
                <p className="text-muted-foreground">Receipt</p>
              </div>

              <div className="bill-info grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t.sale.billNumber}</p>
                  <p className="font-semibold text-foreground">{saleDetail.billNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{t.common.date}</p>
                  <p className="font-semibold text-foreground">
                    {new Date(saleDetail.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="bill-info">
                <p className="text-sm text-muted-foreground">{t.sale.customerName}</p>
                <p className="font-semibold text-foreground">{saleDetail.customerName}</p>
                {saleDetail.customerPhone && (
                  <p className="text-sm text-foreground">{saleDetail.customerPhone}</p>
                )}
                {saleDetail.customerAddress && (
                  <p className="text-sm text-foreground">{saleDetail.customerAddress}</p>
                )}
              </div>

              <table className="bill-items w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2">{t.sale.items}</th>
                    <th className="text-center p-2">{t.sale.quantity}</th>
                    <th className="text-right p-2">{t.sale.unitPrice}</th>
                    <th className="text-right p-2">{t.sale.totalPrice}</th>
                  </tr>
                </thead>
                <tbody>
                  {saleDetail.items.map((item, index) => (
                    <tr key={index}>
                      <td className="p-2">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                      </td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-right">{item.unitPrice.toLocaleString()} ฿</td>
                      <td className="p-2 text-right">{item.totalPrice.toLocaleString()} ฿</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bill-totals space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.sale.subtotal}:</span>
                  <span className="font-semibold">{saleDetail.subtotal.toLocaleString()} ฿</span>
                </div>
                {saleDetail.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.sale.discount}:</span>
                    <span className="font-semibold text-error">
                      -{saleDetail.discount.toLocaleString()} ฿
                    </span>
                  </div>
                )}
                {saleDetail.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.sale.tax}:</span>
                    <span className="font-semibold">{saleDetail.tax.toLocaleString()} ฿</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-lg font-bold">{t.sale.totalAmount}:</span>
                  <span className="text-lg font-bold text-primary">
                    {saleDetail.totalAmount.toLocaleString()} ฿
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.sale.paidAmount}:</span>
                  <span className="font-semibold">{saleDetail.paidAmount.toLocaleString()} ฿</span>
                </div>
                {saleDetail.totalAmount > saleDetail.paidAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">คงเหลือ:</span>
                    <span className="font-semibold text-error">
                      {(saleDetail.totalAmount - saleDetail.paidAmount).toLocaleString()} ฿
                    </span>
                  </div>
                )}
              </div>

              {saleDetail.notes && (
                <div className="bill-footer">
                  <p className="text-sm text-muted-foreground">{t.common.notes}</p>
                  <p className="text-sm text-foreground">{saleDetail.notes}</p>
                </div>
              )}

              <div className="bill-footer mt-8">
                <p className="text-sm text-muted-foreground">
                  ขอบคุณที่ใช้บริการ Thank you for your business
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-foreground mb-4">{t.sale.deleteConfirm}</h2>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                {t.common.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDelete(deleteConfirmId);
                }}
              >
                {t.common.delete}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Status Modal */}
      {paymentEditSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-5 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground">อัปเดตการชำระเงิน</h3>
              <Button variant="ghost" size="sm" onClick={closePaymentEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">ยอดรวม</p>
                  <p className="font-semibold">
                    {paymentEditSale.totalAmount.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ชำระแล้ว</p>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={paymentEditSale.paidAmount}
                    onChange={(e) =>
                      setPaymentEditSale((prev) =>
                        prev ? { ...prev, paidAmount: Number(e.target.value) || 0 } : prev
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">สถานะการชำระเงิน</p>
                <div className="flex gap-2">
                  {paymentStatusOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={paymentEditSale.paymentStatus === opt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setPaymentEditSale((prev) =>
                          prev
                            ? {
                                ...prev,
                                paymentStatus: opt.value,
                                paidAmount:
                                  opt.value === "paid" ? prev.totalAmount : prev.paidAmount,
                              }
                            : prev
                        )
                      }
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={closePaymentEdit}>
                ยกเลิก
              </Button>
              <Button onClick={savePaymentEdit}>บันทึก</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
