export const logDev = (message: string, data?: any) => {
  if (process.env.NODE_ENV === "development" || process.env.DEVELOPMENT === "true") {
    console.log(`[Agent Registration] ${message}`, data ? JSON.stringify(data) : "");
  }
};

/**
 * Context-aware development logger.
 * Usage: logDevCtx("Conversation", "Loading", conversationId)
 * Output: [Conversation] Loading {conversationId}
 */
export const logDevCtx = (ctx: string, message: string, data?: any) => {
  if (process.env.NODE_ENV === "development" || process.env.DEVELOPMENT === "true") {
    console.log(`[${ctx}] ${message}`, data !== undefined ? data : "");
  }
};
