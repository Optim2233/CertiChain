import { cn } from "@/shared/lib/utils"

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-accent/40 animate-pulse rounded-md", className)} {...props} />
}
