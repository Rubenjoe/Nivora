/**
 * The shared session contract between server components, the `/api/v1/auth/me`
 * endpoint, and client navigation state. Types only: safe for both bundles.
 */
export type SessionProfile = {
  id: string;
  displayName: string;
  currency: string;
  mode: "simple" | "pro";
  timezone: string;
  dateFormat: string;
  appearance: string;
  budgetAlertsEnabled: boolean;
  goalAlertsEnabled: boolean;
};
