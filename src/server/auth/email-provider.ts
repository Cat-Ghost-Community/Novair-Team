import "server-only";

// Future verified delivery adapter contract. No provider/no-op implementation is configured.
// Implementations must queue a real message and must never log the one-time reset URL.
export interface AccountEmailProvider {
  queuePasswordReset(message: { recipient: string; displayName: string; resetUrl: string; expiresAt: Date }): Promise<{ messageId: string; status: "queued" }>;
}

export const accountEmailDeliveryConfigured = false;
