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
import { Calendar, Plus, Loader2 } from "lucide-react";
import { createRentalSchema } from "@/lib/trpc/schemas";
import type { RentalStatus } from "@/lib/trpc/schemas";
import type { CreateRentalInput, UpdateRentalStatusInput } from "@/lib/trpc/schemas";
import { useTranslation } from "@/lib/hooks/useTranslation";

export default function RentalsPage() {
  const t = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const utils = trpc.useUtils();

  const { data: availableAssets } = trpc.rentalAsset.getAvailable.useQuery();

  const { data, isLoading } = trpc.rental.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as RentalStatus) : undefined,
    page: 1,
    limit: 50,
  });

  const createMutation = trpc.rental.create.useMutation({
    onSuccess: () => {
      utils.rental.list.invalidate();
      utils.rentalAsset.list.invalidate();
      closeModal();
    },
  });

  const updateStatusMutation = trpc.rental.updateStatus.useMutation({
    onSuccess: () => {
      utils.rental.list.invalidate();
      utils.rentalAsset.list.invalidate();
    },
  });

  const form = useForm<CreateRentalInput>({
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
      notes: "",
    },
  });

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
    const statusMap: Record<string, { label: string; color: "blue" | "success" | "error" | "warning" }> =
      {
        pending: { label: t.rental.statusPending, color: "warning" },
        active: { label: t.rental.statusActive, color: "success" },
        completed: { label: t.rental.statusCompleted, color: "blue" },
        cancelled: { label: t.rental.statusCancelled, color: "error" },
      };
    const statusInfo = statusMap[status] || { label: status, color: "blue" };
    return <Badge variant="status" color={statusInfo.color}>{statusInfo.label}</Badge>;
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
                      {t.rental.status}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.rental.penaltyAmount}
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-foreground">
                      {t.common.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rentals.map((rental) => (
                    <tr key={rental.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-sm font-medium text-foreground">{rental.rentalNumber}</td>
                      <td className="p-3 text-sm text-foreground">{rental.customerName}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(rental.startDate).toLocaleDateString("th-TH")}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(rental.endDate).toLocaleDateString("th-TH")}
                      </td>
                      <td className="p-3">{getStatusBadge(rental.status)}</td>
                      <td className="p-3 text-sm text-muted-foreground">
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
                          {rental.status === "pending" && (
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
                  name="assets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.rental.assets}</FormLabel>
                      <FormControl>
                        <select
                          multiple
                          value={field.value || []}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                            field.onChange(selected);
                          }}
                          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white min-h-[100px]"
                        >
                          {availableAssets?.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.assetCode} - {asset.productName}
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
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.rental.startDate}</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
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
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.rental.dailyRate}</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="deposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.rental.deposit}</FormLabel>
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
