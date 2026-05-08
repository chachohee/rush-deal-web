"use client";

import { useEffect, useState } from "react";

function calc(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    done: diff === 0,
  };
}

export function useCountdown(targetIso: string) {
  const target = new Date(targetIso);
  const [state, setState] = useState(() => calc(target));

  useEffect(() => {
    if (state.done) return;
    const id = setInterval(() => setState(calc(target)), 1000);
    return () => clearInterval(id);
  }, [targetIso]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
