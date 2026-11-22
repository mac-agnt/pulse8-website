"use client";

import { useEffect } from "react";
import { useBasket, useBasketReady } from "@/lib/basket";

/** Empties the saved basket once, after a shop payment has gone through. Renders nothing. */
export function ClearBasket() {
  const ready = useBasketReady();
  const { clear } = useBasket();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
