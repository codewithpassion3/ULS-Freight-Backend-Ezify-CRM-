// 1. Define the const object first
export const LocationType = {
    BUSINESS_TAILGATE_NOT_REQUIRED: "BUSINESS_TAILGATE_NOT_REQUIRED",
    BUSINESS_TAILGATE_REQUIRED: "BUSINESS_TAILGATE_REQUIRED",
    RESIDENCE_TAILGATE_NOT_REQUIRED: "RESIDENCE_TAILGATE_NOT_REQUIRED",
    RESIDENCE_TAILGATE_REQUIRED: "RESIDENCE_TAILGATE_REQUIRED"
} as const;

// 2. Derive the type from the const
export type LocationType = (typeof LocationType)[keyof typeof LocationType];

// 3. Now use the type for strict labels
export const LocationLabels: Record<LocationType, string> = {
    [LocationType.BUSINESS_TAILGATE_NOT_REQUIRED]: "Business - Tailgate not required",
    [LocationType.BUSINESS_TAILGATE_REQUIRED]: "Business - Tailgate required",
    [LocationType.RESIDENCE_TAILGATE_NOT_REQUIRED]: "Residence - Tailgate not required",
    [LocationType.RESIDENCE_TAILGATE_REQUIRED]: "Residence - Tailgate required"
} as const satisfies Record<LocationType, string>;