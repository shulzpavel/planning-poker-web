import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  isSheetMobileViewport,
  prefersReducedSheetMotion,
  sheetBackdropOpacity,
  sheetCloseDurationMs,
  sheetDragOffset,
  sheetEasing,
  sheetEnterDurationMs,
  sheetMoveActivationThreshold,
  sheetSnapBackDurationMs,
  sheetTransformValue,
  shouldCloseSheet,
  type SheetTransformTarget,
} from "./sheetMotion";

type DragSession = {
  pointerId: number;
  startY: number;
  lastY: number;
  startTime: number;
  moved: boolean;
};

function applySheetTransform(sheet: HTMLElement, target: SheetTransformTarget) {
  sheet.style.transform = sheetTransformValue(target);
}

function clearSheetTransform(sheet: HTMLElement) {
  sheet.style.transform = "";
  sheet.style.transition = "";
  sheet.style.willChange = "";
}

function runSheetTransition(
  sheet: HTMLElement,
  target: SheetTransformTarget,
  durationMs: number,
  onDone?: () => void,
) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    sheet.removeEventListener("transitionend", onTransitionEnd);
    onDone?.();
  };
  const onTransitionEnd = (event: TransitionEvent) => {
    if (event.propertyName === "transform") finish();
  };

  sheet.style.willChange = "transform";
  sheet.style.transition = `transform ${durationMs}ms ${sheetEasing.emphasized}`;
  applySheetTransform(sheet, target);
  sheet.addEventListener("transitionend", onTransitionEnd);
  window.setTimeout(finish, durationMs + 50);
}

export function useBottomSheetDrag({
  open,
  sheetRef,
  backdropRef,
  onClose,
}: {
  open: boolean;
  sheetRef: RefObject<HTMLDivElement | null>;
  backdropRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const onCloseRef = useRef(onClose);
  const dragRef = useRef<DragSession | null>(null);
  const suppressHandleClickRef = useRef(false);
  const closingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const enterPlayedRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const setBackdropOpacity = useCallback((dragOffset: number) => {
    const backdrop = backdropRef.current;
    const sheet = sheetRef.current;
    if (!backdrop || !sheet) return;
    backdrop.style.opacity = String(sheetBackdropOpacity(dragOffset, sheet.offsetHeight));
  }, [backdropRef, sheetRef]);

  const resetBackdrop = useCallback(() => {
    const backdrop = backdropRef.current;
    if (!backdrop) return;
    backdrop.style.transition = "";
    backdrop.style.opacity = "";
  }, [backdropRef]);

  const resetSheet = useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    clearSheetTransform(sheet);
    resetBackdrop();
  }, [resetBackdrop, sheetRef]);

  const finishClose = useCallback(() => {
    if (!closingRef.current) return;
    closingRef.current = false;
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    resetSheet();
    onCloseRef.current();
  }, [resetSheet]);

  const animateClose = useCallback((velocity = 0) => {
    const sheet = sheetRef.current;
    if (!sheet || closingRef.current) return;

    if (!isSheetMobileViewport() || prefersReducedSheetMotion()) {
      onCloseRef.current();
      return;
    }

    closingRef.current = true;
    const duration = sheetCloseDurationMs(velocity);
    const backdrop = backdropRef.current;
    if (backdrop) {
      backdrop.style.transition = `opacity ${duration}ms ${sheetEasing.out}`;
      setBackdropOpacity(sheet.offsetHeight);
    }

    runSheetTransition(sheet, "closed", duration, () => {
      closeTimerRef.current = window.setTimeout(finishClose, 0);
    });
  }, [backdropRef, finishClose, setBackdropOpacity, sheetRef]);

  const snapSheetOpen = useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    runSheetTransition(sheet, "open", sheetSnapBackDurationMs(), () => {
      if (!dragRef.current) resetSheet();
    });
    setBackdropOpacity(0);
  }, [resetSheet, setBackdropOpacity, sheetRef]);

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    dragRef.current = null;

    if (!drag || !sheet) return;

    suppressHandleClickRef.current = drag.moved;

    if (!drag.moved) {
      resetSheet();
      return;
    }

    const offset = Math.max(0, drag.lastY - drag.startY);
    const elapsed = Math.max(1, performance.now() - drag.startTime);
    const velocity = offset / elapsed;

    if (shouldCloseSheet(offset, velocity, sheet.offsetHeight)) {
      animateClose(velocity);
      return;
    }

    snapSheetOpen();
  }, [animateClose, resetSheet, sheetRef, snapSheetOpen]);

  const handleWindowPointerMove = useCallback((event: PointerEvent) => {
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    if (!drag || !sheet || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    const delta = event.clientY - drag.startY;
    drag.lastY = event.clientY;
    drag.moved = drag.moved || Math.abs(delta) > sheetMoveActivationThreshold();

    const offset = sheetDragOffset(delta);
    sheet.style.transition = "none";
    sheet.style.willChange = "transform";
    applySheetTransform(sheet, offset);
    setBackdropOpacity(offset);
  }, [setBackdropOpacity, sheetRef]);

  const handleWindowPointerEnd = useCallback((event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerEnd);
    window.removeEventListener("pointercancel", handleWindowPointerEnd);
    endDrag();
  }, [endDrag, handleWindowPointerMove]);

  const onDragHandlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!isSheetMobileViewport() || closingRef.current || event.button !== 0) return;

    const sheet = sheetRef.current;
    if (!sheet) return;

    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      startTime: performance.now(),
      moved: false,
    };

    sheet.style.transition = "none";
    sheet.style.willChange = "transform";

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: false });
    window.addEventListener("pointerup", handleWindowPointerEnd);
    window.addEventListener("pointercancel", handleWindowPointerEnd);
  }, [handleWindowPointerEnd, handleWindowPointerMove, sheetRef]);

  const handleGrabberClick = useCallback(() => {
    if (suppressHandleClickRef.current) {
      suppressHandleClickRef.current = false;
      return;
    }
    animateClose();
  }, [animateClose]);

  useEffect(() => {
    if (!open) {
      enterPlayedRef.current = false;
      closingRef.current = false;
      dragRef.current = null;
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      return;
    }

    const sheet = sheetRef.current;
    if (!sheet || enterPlayedRef.current || !isSheetMobileViewport()) return;

    enterPlayedRef.current = true;
    resetBackdrop();

    if (prefersReducedSheetMotion()) {
      resetSheet();
      return;
    }

    sheet.style.transition = "none";
    applySheetTransform(sheet, "closed");

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        runSheetTransition(sheet, "open", sheetEnterDurationMs(), () => {
          if (!dragRef.current && !closingRef.current) resetSheet();
        });
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, resetBackdrop, resetSheet, sheetRef]);

  useEffect(
    () => () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerEnd);
      window.removeEventListener("pointercancel", handleWindowPointerEnd);
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [handleWindowPointerEnd, handleWindowPointerMove],
  );

  const sheetMotionStyle: CSSProperties = {
    touchAction: isSheetMobileViewport() ? "pan-x" : undefined,
  };

  const dragHandleProps = {
    onPointerDown: onDragHandlePointerDown,
    className: "touch-none select-none cursor-grab active:cursor-grabbing md:cursor-auto md:touch-auto md:select-auto",
  } as const;

  return {
    animateClose,
    dragHandleProps,
    handleGrabberClick,
    sheetMotionStyle,
  };
}
