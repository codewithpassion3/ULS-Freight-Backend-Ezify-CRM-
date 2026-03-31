 export const hasValidField = (payload: Record<string, any>) => {
    return Object.values(payload).some((value) => value !== undefined && value !== null && value !== "");
 }
    