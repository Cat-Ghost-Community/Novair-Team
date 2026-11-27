import "server-only";
import { z } from "zod";
import { getDatabase } from "../db/client";
import { site } from "../../config/site";
import { createAuthentication, type AuthenticationService } from "./service";

export function authenticationEnabled() { return process.env.AUTH_ENABLED === "true"; }
let service: AuthenticationService | undefined;
export function getAuthentication() {
  if (!authenticationEnabled()) throw new Error("Authentication is not enabled.");
  if (!service) service = createAuthentication(getDatabase(), {
    baseURL: site.url.origin, secret: z.string().min(32).parse(process.env.BETTER_AUTH_SECRET),
  });
  return service;
}
