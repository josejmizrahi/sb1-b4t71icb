import { cn } from "@/lib/utils"

interface GridProps {
  children: React.ReactNode
  className?: string
}

export function Grid({ children, className }: GridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
      className
    )}>
      {children}
    </div>
  )
}