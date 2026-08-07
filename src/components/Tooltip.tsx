import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

interface TooltipConfig {
  content: React.ReactNode;
  rect: DOMRect;
  position: "top" | "bottom" | "left" | "right";
}

interface TooltipContextType {
  showTooltip: (content: React.ReactNode, element: HTMLElement, position?: "top" | "bottom" | "left" | "right") => void;
  hideTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<TooltipConfig | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);

  const showTooltip = (
    content: React.ReactNode,
    element: HTMLElement,
    position: "top" | "bottom" | "left" | "right" = "top"
  ) => {
    activeElementRef.current = element;
    const rect = element.getBoundingClientRect();
    setConfig({ content, rect, position });
  };

  const hideTooltip = () => {
    activeElementRef.current = null;
    setConfig(null);
  };

  // Recalculate position on scroll or resize to prevent sticking if active
  useEffect(() => {
    const handleScrollOrResize = () => {
      if (activeElementRef.current && config) {
        const rect = activeElementRef.current.getBoundingClientRect();
        setConfig((prev) => prev ? { ...prev, rect } : null);
      }
    };

    window.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [config]);

  // Calculate coordinates relative to screen viewport (using fixed positioning)
  const getCoords = () => {
    if (!config) return { top: 0, left: 0 };
    const { rect, position } = config;
    
    // Middle points relative to viewport
    const elementMiddleX = rect.left + rect.width / 2;
    const elementMiddleY = rect.top + rect.height / 2;

    switch (position) {
      case "bottom":
        return {
          top: rect.bottom + 6,
          left: elementMiddleX,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          top: elementMiddleY,
          left: rect.left - 6,
          transform: "translate(-100%, -50%)",
        };
      case "right":
        return {
          top: elementMiddleY,
          left: rect.right + 6,
          transform: "translateY(-50%)",
        };
      case "top":
      default:
        return {
          top: rect.top - 6,
          left: elementMiddleX,
          transform: "translate(-50%, -100%)",
        };
    }
  };

  const getAnimationProps = () => {
    if (!config) return {};
    switch (config.position) {
      case "bottom":
        return { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } };
      case "left":
        return { initial: { opacity: 0, x: 4 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 4 } };
      case "right":
        return { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -4 } };
      case "top":
      default:
        return { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 4 } };
    }
  };

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
      {children}
      <AnimatePresence>
        {config && config.content && (
          <motion.div
            style={{
              position: "fixed",
              zIndex: 9999,
              ...getCoords(),
            }}
            {...getAnimationProps()}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="pointer-events-none bg-slate-900/95 backdrop-blur-md border border-slate-800 text-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold font-sans shadow-2xl shadow-black/90 flex items-center gap-1.5 whitespace-nowrap"
          >
            {config.content}
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipContext.Provider>
  );
}

export function useGlobalTooltip() {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error("useGlobalTooltip must be used within a TooltipProvider");
  }
  return context;
}

// Wrapper Component for easy integration
interface TooltipProps {
  content: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  children: React.ReactElement<Record<string, any>>;
  key?: React.Key;
}

export function Tooltip({ content, position = "top", delay = 150, children }: TooltipProps) {
  const { showTooltip, hideTooltip } = useGlobalTooltip();
  const triggerRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const element = e.currentTarget as HTMLElement;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      showTooltip(content, element, position);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    hideTooltip();
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return React.cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      // Preserve original ref
      const { ref } = children as any;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    onMouseEnter: (e: React.MouseEvent) => {
      children.props.onMouseEnter?.(e);
      handleMouseEnter(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      children.props.onMouseLeave?.(e);
      handleMouseLeave();
    },
    onFocus: (e: React.FocusEvent) => {
      children.props.onFocus?.(e);
      const element = e.currentTarget as HTMLElement;
      showTooltip(content, element, position);
    },
    onBlur: (e: React.FocusEvent) => {
      children.props.onBlur?.(e);
      handleMouseLeave();
    }
  });
}
