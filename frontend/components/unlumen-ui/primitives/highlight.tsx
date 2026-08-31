"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type HighlightContextValue = {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
};

const HighlightContext = React.createContext<HighlightContextValue | null>(null);

export function Highlight({
  children,
  className,
  containerClassName,
  style,
  mode = "parent",
  controlledItems = false,
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  style?: React.CSSProperties;
  mode?: "parent" | "self";
  controlledItems?: boolean;
  hover?: boolean;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  return (
    <HighlightContext.Provider value={{ activeId, setActiveId }}>
      <div className={cn("relative", containerClassName)} style={style}>
        {children}
      </div>
    </HighlightContext.Provider>
  );
}

export function HighlightItem({
  children,
  asChild = false,
  className,
}: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}) {
  const context = React.useContext(HighlightContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onPointerEnter: (e: React.PointerEvent) => {
        (children.props as any)?.onPointerEnter?.(e);
        context?.setActiveId("active");
      },
      onPointerLeave: (e: React.PointerEvent) => {
        (children.props as any)?.onPointerLeave?.(e);
        context?.setActiveId(null);
      },
    });
  }

  return (
    <div
      className={className}
      onPointerEnter={() => context?.setActiveId("active")}
      onPointerLeave={() => context?.setActiveId(null)}
    >
      {children}
    </div>
  );
}
