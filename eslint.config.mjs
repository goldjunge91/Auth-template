import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules",
      "build",
      "dist",
      "out",
      "coverage",
      "public",
      "scripts",
      "cypress",
      "playwright",
      "storybook-static",
      "storybook",
      ".next",
      "src/components/ui/",
      "src/components/blocks/",
      "src/components/animata/",
      "src/components/magicui/",
    ],
  },
];  

export default eslintConfig;
