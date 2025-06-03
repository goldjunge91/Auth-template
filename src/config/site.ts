import { env } from "@/env";

/**
 * Defines the type for the site configuration object based on its structure.
 * This allows for type checking and autocompletion when accessing `siteConfig` properties.
 */
export type SiteConfig = typeof siteConfig;

/**
 * The `siteConfig` object stores global configuration settings for the website.
 * These settings can be accessed throughout the application.
 */
export const siteConfig = {
  /** The name of the website or application. */
  name: "Auth-template",
  /** A brief description of the website, often used for SEO purposes. */
  description: "Auth template built with shadcn/ui, and Radix UI.",
  /** The canonical URL of the website, fetched from environment variables. */
  url: env.NEXT_PUBLIC_APP_URL,
  /** An object containing important external links related to the site. */
  links: {
    /** URL to the project's GitHub repository. */
    github: "https://github.com/goldjunge91",
    /** URL to the project's documentation. */
    docs: "https://github.com/goldjunge91",
  },
};
