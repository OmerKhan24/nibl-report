'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}

const defaultFormat = (n: number) =>
  new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);

// Animates from 0 on mount, and from the currently shown value whenever `value` changes.
export default function CountUp({ value, format = defaultFormat, duration = 1400 }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const start = current.current;
    const delta = value - start;
    if (delta === 0) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
      current.current = start + delta * eased;
      setDisplay(current.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format(display)}</>;
}
