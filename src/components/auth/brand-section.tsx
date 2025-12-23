import * as React from "react";
import { Package, ShoppingCart, FileText } from "lucide-react";
import { ownerConfig } from "@/lib/config/owner";

interface FeatureItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

/**
 * FeatureItem - Display a feature with icon, title, and description
 * Used in the login page brand section
 */
export function FeatureItem({ icon: Icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
        <Icon className="h-5 w-5 text-blue-300" />
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-sm text-blue-100/70">{description}</p>
      </div>
    </div>
  );
}

interface BrandSectionProps {
  className?: string;
}

/**
 * BrandSection - Left panel brand section for login page
 * Displays logo, hero content, and features
 */
export function BrandSection({ className }: BrandSectionProps) {
  return (
    <div className={className}>
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
          <Package className="h-6 w-6 text-blue-300" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{ownerConfig.name}</h2>
          <p className="text-sm text-blue-200/70">ระบบจัดการสินค้าและเช่า</p>
        </div>
      </div>

      {/* Hero Content */}
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
            ยินดีต้อนรับสู่ระบบจัดการสินค้า
          </h1>
          <p className="text-lg text-blue-100/80">
            จัดการสินค้า การขาย และการเช่าได้อย่างมีประสิทธิภาพ ผ่านระบบที่ครอบคลุมและใช้งานง่าย
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <FeatureItem
            icon={Package}
            title="จัดการสินค้า"
            description="เพิ่ม แก้ไข และจัดการสินค้าทั้งแบบขายและเช่า"
          />
          <FeatureItem
            icon={ShoppingCart}
            title="ระบบขายและเช่า"
            description="จัดการการขายสินค้าและการเช่าสินค้าได้อย่างครบวงจร"
          />
          <FeatureItem
            icon={FileText}
            title="รายงานและบิล"
            description="สร้างบิลและรายงานการขาย การเช่าได้ทันที"
          />
        </div>
      </div>

      {/* Spacer for layout */}
      <div />
    </div>
  );
}

interface MobileHeaderProps {
  className?: string;
}

/**
 * MobileHeader - Mobile version of brand header
 */
export function MobileHeader({ className }: MobileHeaderProps) {
  return (
    <div className={className}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
        <Package className="h-5 w-5 text-blue-300" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">{ownerConfig.name}</h2>
      </div>
    </div>
  );
}
