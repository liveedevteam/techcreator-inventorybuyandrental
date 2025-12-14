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
import { Package, Plus, Pencil, X, Loader2 } from "lucide-react";
import {
  createRentalAssetSchema,
  updateRentalAssetSchema,
} from "@/lib/trpc/schemas";
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
    defaultValues: editingAsset ? {
      id: "",
      assetCode: "",
      notes: "",
    } : {
      productId: "",
      assetCode: "",
      status: "available" as const,
      notes: "",
    },
  });

  const openCreateModal = () => {
    setEditingAsset(null);
    form.reset({
      productId: "",
      assetCode: "",
      status: "available",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (asset: { id: string; productId: string; assetCode: string; status: string; notes?: string }) => {
    setEditingAsset({ id: asset.id });
    form.reset({
      id: asset.id,
      assetCode: asset.assetCode,
      status: asset.status as RentalAssetStatus,
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
    const statusMap: Record<string, { label: string; color: "blue" | "success" | "error" | "warning" }> =
      {
        available: { label: t.rentalAsset.statusAvailable, color: "success" },
        rented: { label: t.rentalAsset.statusRented, color: "blue" },
        maintenance: { label: t.rentalAsset.statusMaintenance, color: "warning" },
        reserved: { label: t.rentalAsset.statusReserved, color: "blue" },
        damaged: { label: t.rentalAsset.statusDamaged, color: "error" },
      };
    const statusInfo = statusMap[status] || { label: status, color: "blue" };
    return <Badge variant="status" color={statusInfo.color}>{statusInfo.label}</Badge>;
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
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-3 text-sm font-medium text-slate-300">
                      {t.rentalAsset.assetCode}
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-slate-300">
                      {t.product.name}
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-slate-300">
                      {t.rentalAsset.status}
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-slate-300">
                      {t.common.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.assets.map((asset) => (
                    <tr key={asset.id} className="border-b border-slate-800">
                      <td className="p-3 text-sm text-white">{asset.assetCode}</td>
                      <td className="p-3 text-sm text-slate-300">{asset.productName}</td>
                      <td className="p-3">{getStatusBadge(asset.status)}</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(asset)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {editingAsset ? t.rentalAsset.edit : t.rentalAsset.create}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

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
                          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
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

                <FormField
                  control={form.control}
                  name="assetCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.rentalAsset.assetCode}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.rentalAsset.status}</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
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
