"use client";

import * as React from "react";
import { AuthProvider } from "./session-provider";
import { ThemeProvider } from "./theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TempoInit } from "@/app/tempo-init";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>

      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TempoInit />
        <TooltipProvider>
          {children}
        </TooltipProvider>

      </ThemeProvider>
    </AuthProvider>
  );
}
