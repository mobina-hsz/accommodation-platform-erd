import * as React from "react";
import { cn } from "@/lib/utils";
export function Field({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) { return <label className={cn("grid gap-2 text-sm font-medium text-stone-700", className)} {...props} />; }
