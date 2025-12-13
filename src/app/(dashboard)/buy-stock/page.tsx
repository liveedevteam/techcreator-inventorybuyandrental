"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
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
import { Package, AlertTriangle, Plus, Loader2, X, Pencil, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { adjustQuantitySchema, updateBuyStockSchema } from "@/lib/trpc/schemas";
import type { AdjustQuantityInput, UpdateBuyStockInput } from "@/lib/trpc/schemas";
import { useTranslation } from "@/lib/hooks/useTranslation";

export default function BuyStockPage() {
  const t = useTranslation();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "super_admin";

  // Modal states
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<{ id: string; productId: string; quantity: number; minQuantity: number } | null>(null);

  // Filter and pagination states
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page when searching
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const utils = trpc.useUtils();

  // Fetch buy-type products for dropdown
  const { data: productsData } = trpc.product.list.useQuery({
    stockType: "buy",
    page: 1,
    limit: 100, // Maximum allowed limit
  });

  // Fetch stock list with filters and pagination
  // When no filters are applied, fetch more items to ensure all stock is visible
  const effectiveLimit = !debouncedSearch && !lowStockOnly ? 100 : limit;
  const { data, isLoading, error } = trpc.buyStock.list.useQuery({
    page: !debouncedSearch && !lowStockOnly ? 1 : page, // Show all on first page when no filters
    limit: effectiveLimit,
    search: debouncedSearch || undefined,
    lowStockOnly: lowStockOnly || undefined,
  });

  const { data: lowStockData } = trpc.buyStock.checkLowStock.useQuery();

  // Mutations
  const adjustMutation = trpc.buyStock.adjustQuantity.useMutation({
    onSuccess: () => {
      // Invalidate all buyStock queries to refresh data on all pages
      utils.buyStock.list.invalidate();
      utils.buyStock.checkLowStock.invalidate();
      // Also invalidate product list in case it's cached with stock data
      utils.product.list.invalidate();
      setAdjustModalOpen(false);
      adjustForm.reset();
    },
    onError: (error) => {
      console.error("Adjust quantity error:", error);
    },
  });

  const updateMutation = trpc.buyStock.update.useMutation({
    onSuccess: () => {
      // Invalidate all buyStock queries to refresh data on all pages
      utils.buyStock.list.invalidate();
      utils.buyStock.checkLowStock.invalidate();
      // Also invalidate product list in case it's cached with stock data
      utils.product.list.invalidate();
      setIsStockModalOpen(false);
      stockForm.reset();
      setEditingStock(null);
    },
    onError: (error) => {
      console.error("Update stock error:", error);
    },
  });

  // Forms
  const adjustForm = useForm<AdjustQuantityInput>({
    resolver: zodResolver(adjustQuantitySchema),
    defaultValues: {
      productId: "",
      adjustment: 0,
      reason: "",
    },
  });

  const stockForm = useForm<UpdateBuyStockInput>({
    resolver: zodResolver(updateBuyStockSchema),
    defaultValues: {
      productId: "",
      quantity: 0,
      minQuantity: 0,
    },
  });

  const openAdjustModal = (productId: string) => {
    setSelectedProductId(productId);
    adjustForm.reset({ productId, adjustment: 0, reason: "" });
    setAdjustModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingStock(null);
    stockForm.reset({
      productId: "",
      quantity: 0,
      minQuantity: 0,
    });
    setIsStockModalOpen(true);
  };

  const openEditModal = (stock: { id: string; productId: string; quantity: number; minQuantity: number }) => {
    setEditingStock(stock);
    stockForm.reset({
      productId: stock.productId,
      quantity: stock.quantity,
      minQuantity: stock.minQuantity,
    });
    setIsStockModalOpen(true);
  };

  const closeStockModal = () => {
    setIsStockModalOpen(false);
    setEditingStock(null);
    stockForm.reset();
  };

  const onAdjustSubmit = (data: AdjustQuantityInput) => {
    adjustMutation.mutate(data);
  };

  const onStockSubmit = (data: UpdateBuyStockInput) => {
    updateMutation.mutate(data);
  };

  // Pagination calculations
  // Only show pagination when filters are applied (since we show all items when no filters)
  const showPagination = debouncedSearch || lowStockOnly;
  const totalPages = showPagination ? Math.ceil((data?.total || 0) / limit) : 1;
  const canGoPrev = showPagination && page > 1;
  const canGoNext = showPagination && page < totalPages;
  const startItem = showPagination ? (page - 1) * limit + 1 : 1;
  const endItem = showPagination ? Math.min(page * limit, data?.total || 0) : (data?.total || 0);

  // Product options for dropdown
  const productOptions =
    productsData?.products.map((product) => ({
      value: product.id,
      label: `${product.name} (${product.sku})`,
    })) || [];

  return (
    <>
      <PageHeader title={t.nav.buyStock} description="จัดการสต็อกซื้อ">
        {isAdmin && (
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            {t.buyStock.updateStock}
          </Button>
        )}
      </PageHeader>

      <div className="p-6 space-y-6">
        {lowStockData && lowStockData.length > 0 && (
          <SectionCard title={t.buyStock.lowStockAlert} icon={AlertTriangle}>
            <div className="space-y-2">
              {lowStockData.map((stock) => (
                <div
                  key={stock.id}
                  className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded"
                >
                  <div>
                    <p className="font-medium text-white">{stock.productName}</p>
                    <p className="text-sm text-slate-400">
                      {t.buyStock.quantity}: {stock.quantity} / {t.buyStock.minQuantity}:{" "}
                      {stock.minQuantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard title={t.buyStock.title} icon={Package}>
          {/* Search and Filter Controls */}
          <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t.common.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={lowStockOnly ? "default" : "outline"}
              onClick={() => {
                setLowStockOnly(!lowStockOnly);
                setPage(1);
              }}
            >
              {t.buyStock.lowStock}
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
              {error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล"}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !data?.stocks || data.stocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">ไม่มีข้อมูลสต็อก</p>
              <p className="text-sm text-muted-foreground mb-4">
                {search || lowStockOnly
                  ? "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา"
                  : "ยังไม่มีข้อมูลสต็อกสินค้า"}
              </p>
              {isAdmin && !search && !lowStockOnly && (
                <Button onClick={openCreateModal} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t.buyStock.updateStock}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 text-sm font-semibold text-foreground">
                        {t.product.name}
                      </th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">SKU</th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">
                        {t.buyStock.quantity}
                      </th>
                      <th className="text-left p-3 text-sm font-semibold text-foreground">
                        {t.buyStock.minQuantity}
                      </th>
                      <th className="text-right p-3 text-sm font-semibold text-foreground">
                        {t.common.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stocks.map((stock) => {
                      const isLowStock = stock.quantity <= stock.minQuantity;
                      return (
                        <tr
                          key={stock.id}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3 text-sm font-medium text-foreground">
                            {stock.productName}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{stock.productSku}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-foreground">{stock.quantity}</span>
                              {isLowStock && (
                                <Badge variant="status" color="error" className="text-xs">
                                  {t.buyStock.lowStock}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-sm text-foreground">{stock.minQuantity}</td>
                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    openEditModal({
                                      id: stock.id,
                                      productId: stock.productId,
                                      quantity: stock.quantity,
                                      minQuantity: stock.minQuantity,
                                    })
                                  }
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAdjustModal(stock.productId)}
                              >
                                {t.buyStock.adjustQuantity}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {showPagination && totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    แสดง {startItem}-{endItem} จาก {data.total} รายการ
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={!canGoPrev}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t.common.previous}
                    </Button>
                    <div className="text-sm text-foreground">
                      หน้า {page} จาก {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!canGoNext}
                    >
                      {t.common.next}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SectionCard>
      </div>

      {/* Create/Update Stock Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">
                {editingStock ? t.buyStock.updateStock : t.buyStock.updateStock}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeStockModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {updateMutation.error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                {updateMutation.error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล"}
              </div>
            )}

            <Form {...stockForm}>
              <form onSubmit={stockForm.handleSubmit(onStockSubmit)} className="space-y-4">
                <FormField
                  control={stockForm.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.buyStock.product}</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          disabled={!!editingStock}
                          className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">เลือกสินค้า</option>
                          {productOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={stockForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.buyStock.quantity}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            min={0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={stockForm.control}
                    name="minQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.buyStock.minQuantity}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            min={0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeStockModal}>
                    {t.common.cancel}
                  </Button>
                  <Button type="submit" disabled={stockForm.formState.isSubmitting}>
                    {stockForm.formState.isSubmitting ? (
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

      {/* Adjust Quantity Modal */}
      {adjustModalOpen && selectedProductId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">{t.buyStock.adjustQuantity}</h2>
              <Button variant="ghost" size="sm" onClick={() => setAdjustModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {adjustMutation.error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                {adjustMutation.error.message || "เกิดข้อผิดพลาดในการปรับจำนวน"}
              </div>
            )}

            <Form {...adjustForm}>
              <form onSubmit={adjustForm.handleSubmit(onAdjustSubmit)} className="space-y-4">
                <FormField
                  control={adjustForm.control}
                  name="adjustment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.buyStock.adjustment}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          placeholder="เช่น +10 หรือ -5"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        ใส่ค่าบวกเพื่อเพิ่มจำนวน หรือค่าลบเพื่อลดจำนวน
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={adjustForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.buyStock.reason}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ระบุเหตุผล (ไม่บังคับ)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAdjustModalOpen(false);
                      adjustForm.reset();
                    }}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button type="submit" disabled={adjustForm.formState.isSubmitting}>
                    {adjustForm.formState.isSubmitting ? (
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
    </>
  );
}
