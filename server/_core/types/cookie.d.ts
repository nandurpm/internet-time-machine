/*
 * ============================================================
 * FILE: cookie.d.ts
 * PURPOSE: Defines the cookie.d TypeScript declarations used by the hosted server runtime.
 * ============================================================
 */

declare module "cookie" {
  export function parse(
    str: string,
    options?: Record<string, unknown>
  ): Record<string, string>;
}
