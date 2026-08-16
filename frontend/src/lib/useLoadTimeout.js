import { useEffect, useState } from 'react';

/**
 * If `ready` hasn't become true within `ms`, flips to true so the
 * page can stop showing "Loading..." and show an inline "couldn't
 * load, try again" message instead. Resets automatically once
 * `ready` is true, or if the page re-mounts with `ready` false again.
 */
export function useLoadTimeout(ready, ms = 3000) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (ready) {
      setTimedOut(false);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), ms);
    return () => clearTimeout(t);
  }, [ready, ms]);

  return timedOut;
}
