"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Calendar, Plus, Loader2, Eye, X, Printer, Trash2 } from "lucide-react";
import { createRentalSchema } from "@/lib/trpc/schemas";
import type { RentalStatus } from "@/lib/trpc/schemas";
import type { CreateRentalInput, UpdateRentalStatusInput } from "@/lib/trpc/schemas";
import { useTranslation } from "@/lib/hooks/useTranslation";

export default function RentalsPage() {
  const t = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const utils = trpc.useUtils();

  const { data: availableGroupedAssets } = trpc.rentalAsset.getAvailableGrouped.useQuery();

  const { data, isLoading } = trpc.rental.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as RentalStatus) : undefined,
    page: 1,
    limit: 50,
  });

  const { data: rentalDetails } = trpc.rental.getById.useQuery(
    { id: selectedRental || "" },
    { enabled: !!selectedRental && isViewModalOpen }
  );

  const createMutation = trpc.rental.create.useMutation({
    onSuccess: () => {
      utils.rental.list.invalidate();
      utils.rentalAsset.list.invalidate();
      closeModal();
    },
    onError: (error) => {
      console.error("Error creating rental:", error);
    },
  });

  const updateStatusMutation = trpc.rental.updateStatus.useMutation({
    onSuccess: () => {
      utils.rental.list.invalidate();
      utils.rentalAsset.list.invalidate();
    },
  });

  const form = useForm({
    resolver: zodResolver(createRentalSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      assets: [],
      startDate: new Date(),
      endDate: new Date(),
      dailyRate: 0,
      deposit: 0,
      shippingCost: 0,
      notes: "",
    },
  });

  // Auto-calculate daily rate from selected assets
  const selectedAssets = form.watch("assets");
  useEffect(() => {
    if (selectedAssets && selectedAssets.length > 0 && availableGroupedAssets) {
      const totalDailyRate = selectedAssets.reduce((sum, assetItem) => {
        // assetItem is { assetId: string, quantity: number }
        const assetId = assetItem.assetId;
        const quantity = assetItem.quantity || 1;

        // Find which group this asset belongs to
        const group = availableGroupedAssets.find((g) => g.assetIds.includes(assetId));
        return sum + (group?.dailyRentalRate || 0) * quantity;
      }, 0);
      form.setValue("dailyRate", totalDailyRate);
    } else {
      form.setValue("dailyRate", 0);
    }
  }, [selectedAssets, availableGroupedAssets, form]);

  const openCreateModal = () => {
    form.reset({
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      assets: [],
      startDate: new Date(),
      endDate: new Date(),
      dailyRate: 0,
      deposit: 0,
      shippingCost: 0,
      notes: "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    form.reset();
  };

  const onSubmit = (data: CreateRentalInput) => {
    createMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; color: "blue" | "success" | "error" | "warning" }
    > = {
      pending: { label: t.rental.statusPending, color: "warning" },
      active: { label: t.rental.statusActive, color: "success" },
      completed: { label: t.rental.statusCompleted, color: "blue" },
      cancelled: { label: t.rental.statusCancelled, color: "error" },
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
      <PageHeader title={t.nav.rentals} description="จัดการการเช่า">
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          {t.common.create}
        </Button>
      </PageHeader>

      <div className="p-6 space-y-6">
        <SectionCard title={t.rental.title} icon={Calendar}>
          <div className="mb-4 flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
            >
              ทั้งหมด
            </Button>
            {["pending", "active", "completed", "cancelled"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                onClick={() => setStatusFilter(status)}
              >
                {getStatusBadge(status).props.children}
              </Button>
            ))}
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
                      {t.rental.rentalNumber}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.rental.customerName}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.rental.startDate}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.rental.endDate}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.rental.assets}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.rental.status}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.rental.totalAmount}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.rental.deposit}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.rental.penaltyAmount}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.common.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rentals.map((rental) => (
                    <tr
                      key={rental.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3 text-sm font-medium text-foreground">
                        {rental.rentalNumber}
                      </td>
                      <td className="p-3 text-sm text-foreground">{rental.customerName}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(rental.startDate).toLocaleDateString("th-TH")}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(rental.endDate).toLocaleDateString("th-TH")}
                      </td>
                      <td className="p-3 text-sm text-foreground">
                        {rental.assets && rental.assets.length > 0
                          ? (() => {
                              // Group assets by assetCode
                              const groupedAssets = new Map<
                                string,
                                { assetCode: string; productName?: string; count: number }
                              >();

                              for (const asset of rental.assets) {
                                const key = asset.assetCode;
                                if (groupedAssets.has(key)) {
                                  groupedAssets.get(key)!.count += asset.quantity || 1;
                                } else {
                                  groupedAssets.set(key, {
                                    assetCode: asset.assetCode,
                                    productName: asset.productName,
                                    count: asset.quantity || 1,
                                  });
                                }
                              }

                              const groups = Array.from(groupedAssets.values());
                              const totalItems = groups.reduce((sum, g) => sum + g.count, 0);

                              return (
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium">
                                    {groups.length} รายการ (รวม {totalItems} ชิ้น)
                                  </span>
                                  <div className="text-xs text-muted-foreground">
                                    {groups
                                      .slice(0, 2)
                                      .map(
                                        (group) =>
                                          `${group.assetCode}${group.count > 1 ? ` x${group.count}` : ""}`
                                      )
                                      .join(", ")}
                                    {groups.length > 2 && ` +${groups.length - 2} อื่นๆ`}
                                  </div>
                                </div>
                              );
                            })()
                          : "-"}
                      </td>
                      <td className="p-3">{getStatusBadge(rental.status)}</td>
                      <td className="p-3 text-sm text-right text-foreground">
                        {rental.totalAmount.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        บาท
                      </td>
                      <td className="p-3 text-sm text-right text-foreground">
                        {rental.deposit.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        บาท
                      </td>
                      <td className="p-3 text-sm text-right text-muted-foreground">
                        {rental.penaltyAmount && rental.penaltyAmount > 0 ? (
                          <span className="text-error font-semibold">
                            {rental.penaltyAmount.toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            บาท
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRental(rental.id);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {rental.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  updateStatusMutation.mutate({
                                    id: rental.id,
                                    status: "active",
                                  } as UpdateRentalStatusInput);
                                }}
                              >
                                {t.rental.activate}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการเช่านี้?")) {
                                    updateStatusMutation.mutate({
                                      id: rental.id,
                                      status: "cancelled",
                                    } as UpdateRentalStatusInput);
                                  }
                                }}
                                className="text-error hover:text-error"
                              >
                                <X className="h-4 w-4 mr-1" />
                                ยกเลิก
                              </Button>
                            </>
                          )}
                          {rental.status === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                updateStatusMutation.mutate({
                                  id: rental.id,
                                  status: "completed",
                                } as UpdateRentalStatusInput);
                              }}
                            >
                              {t.rental.complete}
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

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-xl font-bold text-foreground mb-4">{t.rental.create}</h2>

            {createMutation.error && (
              <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-md text-error text-sm">
                {createMutation.error.message || "เกิดข้อผิดพลาดในการสร้างการเช่า"}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.rental.customerName}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.rental.customerPhone}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.rental.customerEmail}</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
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
                      <FormLabel>{t.rental.customerAddress}</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assets"
                  render={({ field }) => {
                    const items = field.value || [];

                    const addItem = () => {
                      // Find first available asset group
                      const firstAvailableGroup = availableGroupedAssets?.find(
                        (g) => g.availableCount > 0
                      );
                      if (!firstAvailableGroup || firstAvailableGroup.assetIds.length === 0) return;

                      // Add first available asset from the group
                      field.onChange([
                        ...items,
                        {
                          assetId: firstAvailableGroup.assetIds[0],
                          quantity: 1,
                        },
                      ]);
                    };

                    const removeItem = (index: number) => {
                      const newItems = items.filter((_: unknown, i: number) => i !== index);
                      field.onChange(newItems);
                    };

                    const updateItem = (
                      index: number,
                      fieldName: "assetId" | "quantity",
                      value: string | number
                    ) => {
                      const newItems = [...items];
                      if (fieldName === "assetId") {
                        // When changing asset, get first available asset from the selected group
                        const group = availableGroupedAssets?.find(
                          (g) => `${g.assetCode}_${g.productId}` === value
                        );
                        if (group && group.assetIds.length > 0) {
                          newItems[index] = {
                            ...newItems[index],
                            assetId: group.assetIds[0],
                            quantity: newItems[index].quantity || 1,
                          };
                        }
                      } else {
                        newItems[index] = {
                          ...newItems[index],
                          quantity: Math.max(1, value as number),
                        };
                      }
                      field.onChange(newItems);
                    };

                    return (
                      <FormItem>
                        <div className="flex justify-between items-center mb-2">
                          <FormLabel>{t.rental.assets}</FormLabel>
                          <Button type="button" variant="outline" size="sm" onClick={addItem}>
                            <Plus className="h-4 w-4 mr-2" />
                            เพิ่มรายการ
                          </Button>
                        </div>
                        <FormControl>
                          <div className="space-y-2">
                            {items.map(
                              (item: { assetId: string; quantity: number }, index: number) => {
                                // Find which group this asset belongs to
                                const group = availableGroupedAssets?.find((g) =>
                                  g.assetIds.includes(item.assetId)
                                );
                                const groupKey = group
                                  ? `${group.assetCode}_${group.productId}`
                                  : "";

                                return (
                                  <div
                                    key={index}
                                    className="grid grid-cols-12 gap-2 items-end p-3 border border-border rounded"
                                  >
                                    <div className="col-span-6">
                                      <label className="text-sm text-muted-foreground mb-1 block">
                                        เลือกทรัพย์สิน
                                      </label>
                                      <select
                                        value={groupKey}
                                        onChange={(e) =>
                                          updateItem(index, "assetId", e.target.value)
                                        }
                                        className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground"
                                      >
                                        <option value="">เลือกทรัพย์สิน</option>
                                        {availableGroupedAssets?.map((g) => {
                                          const key = `${g.assetCode}_${g.productId}`;
                                          const availableCount = g.availableCount;
                                          const isOutOfStock = availableCount === 0;
                                          return (
                                            <option key={key} value={key} disabled={isOutOfStock}>
                                              {g.assetCode}
                                              {g.productName ? ` - ${g.productName}` : ""}
                                              {g.dailyRentalRate
                                                ? ` (${g.dailyRentalRate.toLocaleString("th-TH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  })} ฿/วัน)`
                                                : ""}
                                              {` - คงเหลือ ${availableCount} ชิ้น`}
                                              {isOutOfStock ? " [หมด]" : ""}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </div>
                                    <div className="col-span-4">
                                      <label className="text-sm text-muted-foreground mb-1 block">
                                        จำนวน
                                      </label>
                                      <Input
                                        type="number"
                                        min="1"
                                        max={group?.availableCount || 999}
                                        value={item.quantity || 1}
                                        onChange={(e) =>
                                          updateItem(
                                            index,
                                            "quantity",
                                            parseInt(e.target.value) || 1
                                          )
                                        }
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeItem(index)}
                                      >
                                        <Trash2 className="h-4 w-4 text-error" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                            {items.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground border border-border rounded">
                                ยังไม่มีรายการ คลิก &quot;เพิ่มรายการ&quot; เพื่อเพิ่ม
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.rental.startDate}</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              field.onChange(e.target.value ? new Date(e.target.value) : new Date())
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.rental.endDate}</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              field.onChange(e.target.value ? new Date(e.target.value) : new Date())
                            }
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
                    name="dailyRate"
                    render={({ field }) => {
                      // Calculate total amount based on dates and daily rate
                      const startDate = form.watch("startDate") as Date | null;
                      const endDate = form.watch("endDate") as Date | null;
                      const dailyRate = field.value || 0;
                      const days =
                        startDate instanceof Date && endDate instanceof Date && endDate > startDate
                          ? Math.ceil(
                              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                            ) + 1
                          : 0;
                      const totalAmount = days * dailyRate;

                      return (
                        <FormItem>
                          <FormLabel>{t.rental.dailyRate} (คำนวณอัตโนมัติ)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              readOnly
                              className="bg-muted cursor-not-allowed"
                              value={field.value || 0}
                            />
                          </FormControl>
                          {days > 0 && (
                            <p className="text-xs text-muted-foreground">
                              รวม {days} วัน ={" "}
                              {totalAmount.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              บาท
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="deposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>เงินประกัน</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            value={field.value?.toString() || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
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

                  <FormField
                    control={form.control}
                    name="shippingCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ค่าขนส่ง</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            value={field.value?.toString() || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
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

      {/* View Rental Details Modal */}
      {isViewModalOpen && rentalDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">รายละเอียดการเช่า</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedRental(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">
                    เลขที่การเช่า
                  </label>
                  <p className="text-foreground">{rentalDetails.rentalNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">สถานะ</label>
                  <div className="mt-1">{getStatusBadge(rentalDetails.status)}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground">ข้อมูลลูกค้า</label>
                <div className="mt-2 space-y-1">
                  <p className="text-foreground">
                    <strong>ชื่อ:</strong> {rentalDetails.customerName}
                  </p>
                  {rentalDetails.customerPhone && (
                    <p className="text-foreground">
                      <strong>โทรศัพท์:</strong> {rentalDetails.customerPhone}
                    </p>
                  )}
                  {rentalDetails.customerEmail && (
                    <p className="text-foreground">
                      <strong>อีเมล:</strong> {rentalDetails.customerEmail}
                    </p>
                  )}
                  {rentalDetails.customerAddress && (
                    <p className="text-foreground">
                      <strong>ที่อยู่:</strong> {rentalDetails.customerAddress}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">
                    วันที่เริ่มต้น
                  </label>
                  <p className="text-foreground">
                    {new Date(rentalDetails.startDate).toLocaleDateString("th-TH")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">
                    วันที่สิ้นสุด
                  </label>
                  <p className="text-foreground">
                    {new Date(rentalDetails.endDate).toLocaleDateString("th-TH")}
                  </p>
                </div>
              </div>

              {rentalDetails.actualReturnDate && (
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">
                    วันที่คืนจริง
                  </label>
                  <p className="text-foreground">
                    {new Date(rentalDetails.actualReturnDate).toLocaleDateString("th-TH")}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  ทรัพย์สินที่เช่า
                </label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {rentalDetails.assets && rentalDetails.assets.length > 0 ? (
                    (() => {
                      // Calculate rental days
                      const startDate = new Date(rentalDetails.startDate);
                      const endDate = new Date(rentalDetails.endDate);
                      const rentalDays =
                        startDate instanceof Date && endDate instanceof Date
                          ? Math.ceil(
                              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                            ) || 1
                          : 1;

                      // Calculate total assets count
                      const totalAssetsCount = rentalDetails.assets.reduce(
                        (sum, asset) => sum + (asset.quantity || 1),
                        0
                      );

                      // Calculate amount per asset (proportional to total)
                      const amountPerAsset =
                        totalAssetsCount > 0 ? rentalDetails.totalAmount / totalAssetsCount : 0;

                      // Group assets by assetCode and productName
                      const groupedAssets = new Map<
                        string,
                        {
                          assetCode: string;
                          productName?: string;
                          count: number;
                          totalAmount: number;
                        }
                      >();

                      rentalDetails.assets.forEach((asset) => {
                        const quantity = asset.quantity || 1;
                        const assetAmount = amountPerAsset * quantity;
                        const groupKey = `${asset.assetCode || "UNKNOWN"}_${asset.productName || "UNKNOWN"}`;

                        if (groupedAssets.has(groupKey)) {
                          const group = groupedAssets.get(groupKey)!;
                          group.count += quantity;
                          group.totalAmount += assetAmount;
                        } else {
                          groupedAssets.set(groupKey, {
                            assetCode: asset.assetCode || "UNKNOWN",
                            productName: asset.productName,
                            count: quantity,
                            totalAmount: assetAmount,
                          });
                        }
                      });

                      // Convert map to array and display
                      return Array.from(groupedAssets.values()).map((group, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-muted rounded-md border border-border/50 hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-foreground text-sm font-medium">
                                <strong>{group.assetCode}</strong>
                                {group.productName && (
                                  <span className="ml-2 text-foreground/80">
                                    - {group.productName}
                                  </span>
                                )}
                                {group.count > 1 && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({group.count} ชิ้น)
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-foreground text-sm font-semibold">
                                {group.totalAmount.toLocaleString("th-TH", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                บาท
                              </p>
                              <p className="text-xs text-muted-foreground">({rentalDays} วัน)</p>
                            </div>
                          </div>
                        </div>
                      ));
                    })()
                  ) : (
                    <p className="text-muted-foreground">ไม่มีทรัพย์สิน</p>
                  )}
                </div>
                {rentalDetails.assets && rentalDetails.assets.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        รวมทั้งหมด{" "}
                        {rentalDetails.assets.reduce(
                          (sum, asset) => sum + (asset.quantity || 1),
                          0
                        )}{" "}
                        ชิ้น
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        รวมทั้งหมด:{" "}
                        {rentalDetails.totalAmount.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        บาท
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">อัตรารายวัน</label>
                  <p className="text-foreground">
                    {rentalDetails.dailyRate.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    บาท
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">
                    จำนวนเงินรวม
                  </label>
                  <p className="text-foreground font-semibold">
                    {rentalDetails.totalAmount.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    บาท
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">เงินมัดจำ</label>
                  <p className="text-foreground">
                    {rentalDetails.deposit.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    บาท
                  </p>
                </div>
                {rentalDetails.penaltyAmount > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">ค่าปรับ</label>
                    <p className="text-foreground text-error font-semibold">
                      {rentalDetails.penaltyAmount.toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      บาท
                    </p>
                  </div>
                )}
              </div>

              {rentalDetails.notes && (
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">หมายเหตุ</label>
                  <p className="text-foreground mt-1">{rentalDetails.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (rentalDetails) {
                      window.open(`/rentals/${rentalDetails.id}/bill`, "_blank");
                    }
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  พิมพ์ใบเสร็จ
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setSelectedRental(null);
                  }}
                >
                  ปิด
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
