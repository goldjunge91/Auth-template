import { RefObject, useEffect, useState } from "react";

/**
 * A custom React hook that tracks the mouse or touch position.
 * If a `containerRef` is provided, the position is relative to that container.
 * Otherwise, the position is relative to the viewport.
 *
 * @param containerRef - (Optional) A React ref to an HTML or SVG element.
 *                       If provided, the mouse position will be relative to this element.
 * @returns An object containing the `x` and `y` coordinates of the mouse/touch position.
 *          The coordinates are `0, 0` initially.
 */
export const useMousePosition = (
  containerRef?: RefObject<HTMLElement | SVGElement>
) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = (x: number, y: number) => {
      if (containerRef && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const relativeX = x - rect.left;
        const relativeY = y - rect.top;

        // Calculate relative position even when outside the container
        setPosition({ x: relativeX, y: relativeY });
      } else {
        // If no containerRef, position is relative to the viewport
        setPosition({ x, y });
      }
    };

    const handleMouseMove = (ev: MouseEvent) => {
      updatePosition(ev.clientX, ev.clientY);
    };

    const handleTouchMove = (ev: TouchEvent) => {
      if (ev.touches.length > 0) {
        const touch = ev.touches[0];
        updatePosition(touch.clientX, touch.clientY);
      }
    };

    // Listen for both mouse and touch events on the window
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [containerRef]); // Rerun effect if containerRef changes

  return position;
};
