"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-95 active:brightness-90",
        outline: "border border-border bg-card hover:bg-accent/30",
        ghost: "hover:bg-accent/30",
        destructive: "bg-destructive text-white hover:brightness-95 active:brightness-90",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        "icon-sm": "size-8 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
