import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground font-semibold shadow-[0_8px_24px_-10px_rgba(217,184,118,0.55)] [a]:hover:bg-primary/90 hover:bg-primary/90 disabled:bg-white/[0.06] disabled:text-muted-foreground disabled:shadow-none disabled:opacity-100",
        secondary:
          "bg-surface text-foreground border-hair hover:bg-surface-2",
        ghost: "hover:bg-white/5 hover:text-foreground",
        destructive:
          "bg-destructive/12 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20",
        outline:
          "border-hair bg-transparent hover:bg-white/5 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-4",
        xs: "h-8 gap-1 px-2.5 text-xs",
        sm: "h-9 gap-1.5 px-3 text-sm",
        lg: "h-12 gap-2 px-5 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
