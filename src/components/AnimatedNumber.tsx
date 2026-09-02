import React, { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { prefersReducedMotion } from "../lib/motion";

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  duration?: number;
}

// Números financeiros/contagens que contam do valor anterior até o novo — nunca reinicia
// do zero depois da primeira carga (trocar o filtro de período não deve "resetar" o KPI
// visualmente, só animar até o novo valor). Cai direto pro valor final sem animar
// se o sistema operacional pedir "reduzir movimento".
export function AnimatedNumber({ value, format, duration = 0.7 }: AnimatedNumberProps) {
  const previousValue = useRef(0);
  const [display, setDisplay] = useState(() => format(prefersReducedMotion() ? value : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(format(value));
      previousValue.current = value;
      return;
    }
    const controls = animate(previousValue.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplay(format(latest));
        previousValue.current = latest;
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
}
