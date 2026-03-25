export const SignatureType = {
  NONE: 'NONE',
  REQUIRED: 'REQUIRED',
  ADULT_REQUIRED: 'ADULT_REQUIRED',
} as const;

export type SignatureType = (typeof SignatureType)[keyof typeof SignatureType];

export const SignatureLabels = {
  [SignatureType.NONE]: 'None',
  [SignatureType.REQUIRED]: 'Required',
  [SignatureType.ADULT_REQUIRED]: 'Adult Required',
} as const satisfies Record<SignatureType, string>;