"use client";

import { createContext, useContext, type ReactNode } from "react";

interface ExecutionContextValue {
  runSingle: (nodeId: string) => void;
}

const ExecutionContext = createContext<ExecutionContextValue | null>(null);

export function ExecutionProvider({
  children,
  runSingle,
}: {
  children: ReactNode;
  runSingle: (nodeId: string) => void;
}) {
  return (
    <ExecutionContext.Provider value={{ runSingle }}>
      {children}
    </ExecutionContext.Provider>
  );
}

export function useNodeExecution() {
  return useContext(ExecutionContext);
}
