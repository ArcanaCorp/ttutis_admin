'use client';

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";

const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
};

export default function Modal({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    size = "md",
    closeOnBackdrop = true,
    showCloseButton = true,
    className = "",
}) {
    const titleId = useId();
    const descriptionId = useId();
    const panelRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return undefined;

        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        const panel = panelRef.current;
        const firstFocusable = panel?.querySelector('[data-modal-autofocus]')
            || panel?.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
            || panel?.querySelector('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
        document.body.style.overflow = "hidden";
        (firstFocusable || panel)?.focus();

        const handleKeyDown = event => {
            if (event.key === "Escape") {
                event.stopPropagation();
                onCloseRef.current?.();
                return;
            }

            if (event.key !== "Tab" || !panel) return;
            const focusable = [...panel.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
            )].filter(element => element.getAttribute("aria-hidden") !== "true");

            if (!focusable.length) {
                event.preventDefault();
                panel.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        };
    }, [open]);

    if (!open) return null;

    const handleBackdropMouseDown = event => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4" onMouseDown={handleBackdropMouseDown}>
            <section
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
                className={`my-auto w h ${sizeClasses[size] || sizeClasses.md} rounded-2xl bg-white p-5 shadow-xl outline-none ${className} scroll scroll-y-auto`}
                style={{"--w": "60%", "--mxh": "450px"}}
            >
                <header className="flex items-start justify-between gap-md">
                    <div className="min-w-0">
                        {title && <h2 id={titleId} className="text-lg font-semibold">{title}</h2>}
                        {description && <p id={descriptionId} className="mt-1 text-sm text-gray-500">{description}</p>}
                    </div>
                    {showCloseButton && (
                        <Button
                            variant="ghost"
                            icon={X}
                            iconOnly
                            accessibilityLabel="Cerrar diálogo"
                            onClick={onClose}
                        />
                    )}
                </header>
                <div className="mt-5">{children}</div>
                {footer && <footer className="mt-5 flex flex-wrap justify-end gap-sm">{footer}</footer>}
            </section>
        </div>
    );
}
