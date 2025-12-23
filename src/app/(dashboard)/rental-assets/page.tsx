"use client";

import { useState } from "react";
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
import { Package, Plus, Pencil, Loader2 } from "lucide-react";
import { createRentalAssetSchema, updateRentalAssetSchema } from "@/lib/trpc/schemas";
import type {
  CreateRentalAssetInput,
  UpdateRentalAssetInput,
  RentalAssetStatus,
} from "@/lib/trpc/schemas";
import { useTranslation } from "@/lib/hooks/useTranslation";

export default function RentalAssetsPage() {
  const t = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<{ id: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const utils = trpc.useUtils();

  const { data: products } = trpc.product.list.useQuery({
    stockType: "rental",
    page: 1,
    limit: 100,
  });

  const { data, isLoading } = trpc.rentalAsset.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as RentalAssetStatus) : undefined,
    page: 1,
    limit: 50,
  });

  const createMutation = trpc.rentalAsset.create.useMutation({
    onSuccess: () => {
      utils.rentalAsset.list.invalidate();
      closeModal();
    },
  });

  const updateMutation = trpc.rentalAsset.update.useMutation({
    onSuccess: () => {
      utils.rentalAsset.list.invalidate();
      closeModal();
    },
  });

  const form = useForm({
    resolver: zodResolver(editingAsset ? updateRentalAssetSchema : createRentalAssetSchema),
    defaultValues: editingAsset
      ? {
          id: "",
          assetCode: "",
          notes: "",
        }
      : {
          productId: "",
          assetCode: "",
          quantity: 1,
          status: "available" as const,
          notes: "",
        },
  });

  const openCreateModal = () => {
    setEditingAsset(null);
    form.reset({
      productId: "",
      assetCode: "",
      quantity: 1,
      status: "available",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (asset: {
    id: string;
    productId: string;
    assetCode: string;
    statusCounts?: {
      available: number;
      rented: number;
      maintenance: number;
      reserved: number;
      damaged: number;
    };
    notes?: string;
  }) => {
    setEditingAsset({ id: asset.id });
    // Determine the most common status for editing
    const statusCounts = asset.statusCounts || {
      available: 0,
      rented: 0,
      maintenance: 0,
      reserved: 0,
      damaged: 0,
    };
    const statuses = Object.entries(statusCounts) as [RentalAssetStatus, number][];
    const mostCommonStatus = statuses.reduce(
      (max, [status, count]) => (count > max[1] ? [status, count] : max),
      ["available" as RentalAssetStatus, 0] as [RentalAssetStatus, number]
    )[0];

    form.reset({
      id: asset.id,
      assetCode: asset.assetCode,
      status: mostCommonStatus,
      notes: asset.notes || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
    form.reset();
  };

  const onSubmit = (data: CreateRentalAssetInput | UpdateRentalAssetInput) => {
    if (editingAsset) {
      updateMutation.mutate({ id: editingAsset.id, ...data } as UpdateRentalAssetInput);
    } else {
      createMutation.mutate(data as CreateRentalAssetInput);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; color: "blue" | "success" | "error" | "warning" }
    > = {
      available: { label: t.rentalAsset.statusAvailable, color: "success" },
      rented: { label: t.rentalAsset.statusRented, color: "blue" },
      maintenance: { label: t.rentalAsset.statusMaintenance, color: "warning" },
      reserved: { label: t.rentalAsset.statusReserved, color: "blue" },
      damaged: { label: t.rentalAsset.statusDamaged, color: "error" },
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
      <PageHeader title={t.nav.rentalAssets} description="จัดการทรัพย์สินเช่า">
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          {t.common.create}
        </Button>
      </PageHeader>

      <div className="p-6 space-y-6">
        <SectionCard title={t.rentalAsset.title} icon={Package}>
          <div className="mb-4 flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
            >
              ทั้งหมด
            </Button>
            {["available", "rented", "maintenance", "reserved", "damaged"].map((status) => (
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
                      {t.rentalAsset.assetCode}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.product.name}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.rentalAsset.remaining}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.rentalAsset.dailyRate}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.rentalAsset.monthlyRate}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.rentalAsset.insuranceFee}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.rentalAsset.replacementPrice}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.rentalAsset.status}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.common.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.assets.map((asset) => {
                    // Type guard to check if asset has grouped data
                    const hasStatusCounts = "statusCounts" in asset && "totalCount" in asset;
                    const statusCounts = hasStatusCounts ? asset.statusCounts : null;
                    const availableCount = statusCounts?.available || 0;

                    const hasStatusField = (
                      value: typeof asset
                    ): value is typeof asset & { status?: RentalAssetStatus } => "status" in value;

                    // Build status breakdown text
                    const statusBreakdown = statusCounts
                      ? Object.entries(statusCounts)
                          .filter(([, count]) => count > 0)
                          .map(([status, count]) => {
                            const statusLabels: Record<string, string> = {
                              available: t.rentalAsset.statusAvailable,
                              rented: t.rentalAsset.statusRented,
                              maintenance: t.rentalAsset.statusMaintenance,
                              reserved: t.rentalAsset.statusReserved,
                              damaged: t.rentalAsset.statusDamaged,
                            };
                            return `${count} ${statusLabels[status] || status}`;
                          })
                          .join(", ")
                      : null;

                    return (
                      <tr
                        key={asset.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 text-sm font-medium text-foreground">
                          {asset.assetCode}
                        </td>
                        <td className="p-3 text-sm text-foreground">{asset.productName}</td>
                        <td className="p-3 text-sm text-right text-foreground">
                          <span className="font-semibold">{availableCount}</span>
                          <span className="text-muted-foreground text-xs ml-1">ชิ้น</span>
                        </td>
                        <td className="p-3 text-sm text-right text-foreground">
                          {asset.dailyRentalRate !== undefined
                            ? asset.dailyRentalRate.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "-"}
                        </td>
                        <td className="p-3 text-sm text-right text-foreground">
                          {asset.monthlyRentalRate !== undefined
                            ? asset.monthlyRentalRate.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "-"}
                        </td>
                        <td className="p-3 text-sm text-right text-foreground">
                          {asset.insuranceFee !== undefined
                            ? asset.insuranceFee.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "-"}
                        </td>
                        <td className="p-3 text-sm text-right text-foreground">
                          {asset.replacementPrice !== undefined
                            ? asset.replacementPrice.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "-"}
                        </td>
                        <td className="p-3">
                          {statusBreakdown ? (
                            <div className="flex flex-col gap-1">
                              {statusCounts && (
                                <>
                                  {statusCounts.available > 0 && (
                                    <Badge variant="status" color="success" className="text-xs">
                                      {statusCounts.available} {t.rentalAsset.statusAvailable}
                                    </Badge>
                                  )}
                                  {statusCounts.rented > 0 && (
                                    <Badge variant="status" color="blue" className="text-xs">
                                      {statusCounts.rented} {t.rentalAsset.statusRented}
                                    </Badge>
                                  )}
                                  {statusCounts.maintenance > 0 && (
                                    <Badge variant="status" color="warning" className="text-xs">
                                      {statusCounts.maintenance} {t.rentalAsset.statusMaintenance}
                                    </Badge>
                                  )}
                                  {statusCounts.reserved > 0 && (
                                    <Badge variant="status" color="blue" className="text-xs">
                                      {statusCounts.reserved} {t.rentalAsset.statusReserved}
                                    </Badge>
                                  )}
                                  {statusCounts.damaged > 0 && (
                                    <Badge variant="status" color="error" className="text-xs">
                                      {statusCounts.damaged} {t.rentalAsset.statusDamaged}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          ) : (
                            getStatusBadge(
                              hasStatusField(asset) && asset.status ? asset.status : "available"
                            )
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(asset)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {editingAsset ? t.rentalAsset.edit : t.rentalAsset.create}
            </h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.product.title}</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground"
                        >
                          <option value="">เลือกสินค้า</option>
                          {products?.products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.sku})
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
                    control={form.control}
                    name="assetCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.rentalAsset.assetCode}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="เช่น 001" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!editingAsset && (
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.common.quantity}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              value={field.value || 1}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.rentalAsset.status}</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground"
                        >
                          <option value="available">{t.rentalAsset.statusAvailable}</option>
                          <option value="rented">{t.rentalAsset.statusRented}</option>
                          <option value="maintenance">{t.rentalAsset.statusMaintenance}</option>
                          <option value="reserved">{t.rentalAsset.statusReserved}</option>
                          <option value="damaged">{t.rentalAsset.statusDamaged}</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
    </>
  );
}
