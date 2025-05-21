"use client";

import { SessionProvider } from "next-auth/react";

type Props = {
  children?: React.ReactNode;
};

export const AuthProvider = ({ children }: Props) => {
  return <SessionProvider>{children}</SessionProvider>;
};

// "use client"

// import { SessionProvider } from "next-auth/react"

// type AuthProviderProps = {
//   children: React.ReactNode
// }

// export function AuthProvider({ children }: AuthProviderProps) {
//   return <SessionProvider>{children}</SessionProvider>
// }
