import { useEffect, useRef } from 'react';

// Runs the effect once on mount (no dependency list, so no lint noise at call sites).
export function useEffectOnce(effect) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    effect();
  }, []);
}
