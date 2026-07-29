
export const logDev = (message: string, data?: any) => {
  if (process.env.NODE_ENV === "development" || process.env.DEVELOPMENT === "true") {
    console.log(`[Agent Registration] ${message}`, data ? JSON.stringify(data) : "");
  }
};