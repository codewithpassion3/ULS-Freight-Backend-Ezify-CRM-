import { ENV } from "src/common/constants/env";

export function getEnv(key: keyof typeof ENV): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing or empty environment variable: ${key}`);
  }

  return value;
}