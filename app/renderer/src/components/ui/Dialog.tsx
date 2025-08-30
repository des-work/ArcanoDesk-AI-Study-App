import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../../lib/cn";
import { Card } from "./Card";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
      <DialogPrimitive.Content className={cn("fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,720px)]", className)} {...props}>
        <Card className="p-6">{props.children}</Card>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
