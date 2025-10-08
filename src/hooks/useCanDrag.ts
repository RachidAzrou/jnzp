import { useEffect, useState } from "react";

/**
 * Hook to detect if the user is on a desktop device with pointer capabilities
 * Returns true if desktop (hover + fine pointer), false if mobile/tablet
 */
export function useCanDrag() {
  const [canDrag, setCanDrag] = useState(true);
  
  useEffect(() => {
    const isDesktopPointer =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setCanDrag(isDesktopPointer);
  }, []);
  
  return canDrag;
}
