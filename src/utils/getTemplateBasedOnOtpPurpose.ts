import { OtpPurpose } from "src/common/enum/otp-purpose.enum"

export const getTemplateBasedOnOtpPurpose = (purpose: string) => {
    switch(purpose){
        case OtpPurpose.EMAIL_VERIFICATION:
            return "verify-email"

        case OtpPurpose.PASSWORD_RESET:
            return "forgot-password"
        
        default:
            return ""
    }
}