import 'express-session'

declare module 'express-session' {
    interface SessionData {
        userId?: number;
        role?: string;
        companyId?: number;
        permissions?: Record<string, any>[]
    }
}