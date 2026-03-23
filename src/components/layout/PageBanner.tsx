import { cn } from "@/lib/utils";

interface PageBannerProps {
  title: string | React.ReactNode;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageBanner({ title, subtitle, children, className }: PageBannerProps) {
  return (
    <div
      className={cn(
        "relative -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-8 px-4 py-8 md:px-8 md:py-10 overflow-hidden rounded-b-2xl",
        className
      )}
      style={{
        background: "var(--gradient-ocean)",
      }}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-white/5 translate-y-1/2" />
      <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-white/[0.03]" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {typeof title === "string" ? (
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {title}
            </h1>
          ) : (
            title
          )}
          {subtitle && (
            <p className="mt-1 text-white/70 text-sm md:text-base">{subtitle}</p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
        )}
      </div>
    </div>
  );
}
