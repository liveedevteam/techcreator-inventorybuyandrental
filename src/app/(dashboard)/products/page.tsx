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
import { Plus, Pencil, Trash2, X, Loader2, Package } from "lucide-react";
import { createProductSchema, updateProductSchema } from "@/lib/trpc/schemas";
import type { CreateProductInput, UpdateProductInput } from "@/lib/trpc/schemas";
import { useTranslation } from "@/lib/hooks/useTranslation";

export default function ProductsPage() {
  const t = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{ id: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [stockTypeFilter, setStockTypeFilter] = useState<"buy" | "rental" | "all">("all");

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.product.list.useQuery({
    stockType: stockTypeFilter !== "all" ? stockTypeFilter : undefined,
    page: 1,
    limit: 50,
  });

  const createMutation = trpc.product.create.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
      closeModal();
    },
  });

  const updateMutation = trpc.product.update.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
      closeModal();
    },
  });

  const deleteMutation = trpc.product.delete.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
      setDeleteConfirmId(null);
    },
  });

  const form = useForm<CreateProductInput | UpdateProductInput>({
    resolver: zodResolver(editingProduct ? updateProductSchema : createProductSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      category: "",
      price: undefined,
      unit: "",
      images: [],
      stockType: "buy",
    },
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    form.reset({
      name: "",
      description: "",
      sku: "",
      category: "",
      price: undefined,
      unit: "",
      images: [],
      stockType: "buy",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: { id: string; name: string; description?: string; sku: string; category?: string; price?: number; unit?: string; images?: string[]; stockType: "buy" | "rental" }) => {
    setEditingProduct({ id: product.id });
    form.reset({
      name: product.name,
      description: product.description || "",
      sku: product.sku,
      category: product.category || "",
      price: product.price,
      unit: product.unit || "",
      images: product.images || [],
      stockType: product.stockType,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    form.reset();
  };

  const onSubmit = (data: CreateProductInput | UpdateProductInput) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, ...data } as UpdateProductInput);
    } else {
      createMutation.mutate(data as CreateProductInput);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  return (
    <>
      <PageHeader title={t.nav.products} description="จัดการสินค้า">
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          {t.common.create}
        </Button>
      </PageHeader>

      <div className="p-6 space-y-6">
        <SectionCard title={t.product.title} icon={Package}>
          <div className="mb-4 flex gap-2">
            <Button
              variant={stockTypeFilter === "all" ? "default" : "outline"}
              onClick={() => setStockTypeFilter("all")}
            >
              ทั้งหมด
            </Button>
            <Button
              variant={stockTypeFilter === "buy" ? "default" : "outline"}
              onClick={() => setStockTypeFilter("buy")}
            >
              {t.product.stockTypeBuy}
            </Button>
            <Button
              variant={stockTypeFilter === "rental" ? "default" : "outline"}
              onClick={() => setStockTypeFilter("rental")}
            >
              {t.product.stockTypeRental}
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
                    <th className="text-left p-3 text-sm font-semibold text-foreground">SKU</th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.product.name}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.product.category}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.product.stockType}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.product.price}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.common.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.products.map((product) => (
                    <tr key={product.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-sm font-medium text-foreground">{product.sku}</td>
                      <td className="p-3 text-sm text-foreground">{product.name}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {product.category || "-"}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="status"
                          color={product.stockType === "buy" ? "blue" : "success"}
                        >
                          {product.stockType === "buy"
                            ? t.product.stockTypeBuy
                            : t.product.stockTypeRental}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-foreground">
                        {product.price ? `${product.price} ${product.unit || ""}` : "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-error" />
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
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">
                {editingProduct ? t.product.edit : t.product.create}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.product.name}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.product.sku}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stockType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.product.stockType}</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground"
                        >
                          <option value="buy">{t.product.stockTypeBuy}</option>
                          <option value="rental">{t.product.stockTypeRental}</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.common.description}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.product.category}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.product.price}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.product.unit}</FormLabel>
                      <FormControl>
                        <Input {...field} />
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

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-foreground mb-4">{t.product.deleteConfirm}</h2>
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
    </>
  );
}
