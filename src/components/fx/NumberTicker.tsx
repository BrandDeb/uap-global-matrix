'use client';

/** Spring-animated counter (Magic UI–style) built on Motion. */
import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';

export default function NumberTicker({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(0, { stiffness: 60, damping: 18 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  return <motion.span className={className}>{display}</motion.span>;
}
