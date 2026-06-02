"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"
import { useKeyboardInset } from "@/lib/use-keyboard-inset"

function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  // `repositionInputs={false}` apaga la lógica de teclado de vaul (inestable en
  // iOS/iPad). El reposicionamiento sobre el teclado lo maneja `DrawerContent`
  // con `useKeyboardInset`. Va antes de `{...props}` para permitir override.
  return (
    <DrawerPrimitive.Root data-slot="drawer" repositionInputs={false} {...props} />
  )
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const inset = useKeyboardInset()

  // Con el teclado abierto limitamos el drawer al área visible y lo apoyamos
  // sobre el teclado (`bottom`). Anula el `max-h-[85dvh]`/`bottom-0` de Tailwind
  // por especificidad inline. Asume dirección `bottom` (la única usada en la app).
  const keyboardStyle: React.CSSProperties | undefined = inset.isOpen
    ? { maxHeight: `${inset.visibleHeight}px`, bottom: `${inset.bottom}px` }
    : undefined

  // vaul ya no hace scrollIntoView (lo apagamos con `repositionInputs={false}`),
  // así que traemos el campo enfocado a la vista una vez que el layout se ajustó.
  React.useEffect(() => {
    if (!inset.isOpen) return
    const content = contentRef.current
    const active = document.activeElement
    if (!content || !active || !content.contains(active)) return
    const id = requestAnimationFrame(() => {
      active.scrollIntoView({ block: "center", behavior: "smooth" })
    })
    return () => cancelAnimationFrame(id)
  }, [inset.isOpen, inset.bottom])

  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={contentRef}
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content fixed z-50 flex h-auto flex-col overflow-hidden bg-popover text-sm text-popover-foreground data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[85dvh] data-[vaul-drawer-direction=bottom]:rounded-t-3xl data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-3xl data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-3xl data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[85dvh] data-[vaul-drawer-direction=top]:rounded-b-3xl data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm",
          className
        )}
        style={{ ...style, ...keyboardStyle }}
        {...props}
      >
        <div className="mx-auto mt-3 hidden h-1.5 w-12 shrink-0 rounded-full bg-foreground/15 group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

// Zona scrolleable del drawer. Tiene `data-vaul-no-drag` para que vaul no
// interprete los taps en formularios como inicio de drag-to-close (esto antes
// rompía los botones en iOS y dejaba pasar el scroll al fondo). El drag para
// cerrar sigue funcionando desde el handle y el header. `overscroll-contain`
// evita que el scroll encadene al body cuando se llega al tope/fondo.
function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      data-vaul-no-drag=""
      className={cn(
        "flex-1 min-h-0 overflow-y-auto overscroll-contain px-4",
        className
      )}
      {...props}
    />
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-0.5 md:text-left",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        // Respeta la safe-area inferior (notch/home indicator). Con el teclado
        // abierto la safe-area colapsa a ~0, por eso el `max()` evita JS extra.
        "mt-auto flex flex-col gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        className
      )}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "font-heading text-lg font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerBody,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
