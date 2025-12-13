import * as React from "react";
import { Calendar, Car, MessageSquare } from "lucide-react";

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
          <Calendar className="h-6 w-6 text-blue-300" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Loops Event Manager</h2>
          <p className="text-sm text-blue-200/70">Administrative Portal</p>
        </div>
      </div>

      {/* Hero Content */}
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
            Welcome Back to Your Event Management Hub
          </h1>
          <p className="text-lg text-blue-100/80">
            Streamline your travel bookings, manage vehicle assignments, and
            communicate seamlessly with your team through our comprehensive
            platform.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <FeatureItem
            icon={Calendar}
            title="Event Booking Management"
            description="Organize and track all event bookings efficiently"
          />
          <FeatureItem
            icon={Car}
            title="Vehicle Assignment System"
            description="Assign and manage transportation logistics"
          />
          <FeatureItem
            icon={MessageSquare}
            title="LINE Messaging Integration"
            description="Communicate directly with passengers and staff"
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
        <Calendar className="h-5 w-5 text-blue-300" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">Loops Event Manager</h2>
      </div>
    </div>
  );
}
