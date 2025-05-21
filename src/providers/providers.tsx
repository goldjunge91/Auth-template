"use client";

import * as React from "react";
import { AuthProvider } from "./session_provider";
import { ThemeProvider } from "./theme-provider";

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
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}