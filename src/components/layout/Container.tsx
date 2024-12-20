import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg" | "xl" | "full";
}

export function Container({ children, className, size = "default" }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4",
        {
          "max-w-7xl": size === "default",
          "max-w-3xl": size === "sm",
          "max-w-5xl": size === "lg",
          "max-w-[1400px]": size === "xl",
          "max-w-none": size === "full",
        },
        className
      )}
    >
      {children}
    </div>
  );
}