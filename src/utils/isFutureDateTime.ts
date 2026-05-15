import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsFutureDateTime(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDateTime',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value) return true;

          const inputDate = new Date(value);

          if (isNaN(inputDate.getTime())) {
            return false;
          }

          return inputDate.getTime() > Date.now();
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a future datetime`;
        },
      },
    });
  };
}