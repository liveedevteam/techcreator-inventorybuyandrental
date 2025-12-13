"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { ActivityEntityType } from "@/lib/trpc/schemas/activity-log.schema";
import { PageHeader, SectionCard, Badge, Button } from "@/components";
import { FileText, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/hooks/useTranslation";

export default function ActivityLogsPage() {
  const t = useTranslation();
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");

  const { data, isLoading } = trpc.activityLog.list.useQuery({
    entityType: entityTypeFilter !== "all" ? (entityTypeFilter as ActivityEntityType) : undefined,
    page: 1,
    limit: 50,
  });

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { label: string; color: "blue" | "success" | "error" }> = {
      create: { label: t.activityLog.actionCreate, color: "success" },
      update: { label: t.activityLog.actionUpdate, color: "blue" },
      delete: { label: t.activityLog.actionDelete, color: "error" },
    };
    const actionInfo = actionMap[action] || { label: action, color: "blue" };
    return <Badge variant="status" color={actionInfo.color}>{actionInfo.label}</Badge>;
  };

  const getEntityTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      product: t.activityLog.entityTypeProduct,
      buyStock: t.activityLog.entityTypeBuyStock,
      rentalAsset: t.activityLog.entityTypeRentalAsset,
      rental: t.activityLog.entityTypeRental,
      user: t.activityLog.entityTypeUser,
    };
    return typeMap[type] || type;
  };

  return (
    <>
      <PageHeader title={t.nav.activityLogs} description="บันทึกกิจกรรมระบบ" />

      <div className="p-6 space-y-6">
        <SectionCard title={t.activityLog.title} icon={FileText}>
          <div className="mb-4 flex gap-2 flex-wrap">
            <Button
              variant={entityTypeFilter === "all" ? "default" : "outline"}
              onClick={() => setEntityTypeFilter("all")}
            >
              ทั้งหมด
            </Button>
            {["product", "buyStock", "rentalAsset", "rental", "user"].map((type) => (
              <Button
                key={type}
                variant={entityTypeFilter === type ? "default" : "outline"}
                onClick={() => setEntityTypeFilter(type)}
              >
                {getEntityTypeLabel(type)}
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
                      {t.activityLog.createdAt}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.activityLog.user}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.activityLog.action}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.activityLog.entityType}
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-foreground">
                      {t.activityLog.entityName}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.logs.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("th-TH")}
                      </td>
                      <td className="p-3 text-sm text-foreground">
                        {log.userName || log.userEmail || log.userId}
                      </td>
                      <td className="p-3">{getActionBadge(log.action)}</td>
                      <td className="p-3 text-sm text-foreground">
                        {getEntityTypeLabel(log.entityType)}
                      </td>
                      <td className="p-3 text-sm font-medium text-foreground">{log.entityName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
