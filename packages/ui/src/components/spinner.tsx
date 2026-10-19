import { cn } from "../lib/cn"
import { Loader2Icon } from "lucide-react"

import { useUiLabels } from "../labels"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const labels = useUiLabels()
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label={labels.loading} className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
