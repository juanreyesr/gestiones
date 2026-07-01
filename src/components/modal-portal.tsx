"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal must only render after hydration to avoid a server/client mismatch
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
