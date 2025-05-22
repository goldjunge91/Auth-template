import { env } from "@/env";

export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Auth-template",
  description: "Auth template built with shadcn/ui, and Radix UI.",
  url: env.NEXT_PUBLIC_APP_URL,
  links: {
    github: "https://github.com/goldjunge91",
    docs: "https://github.com/goldjunge91",
  },
};
