// @flow

import { type TInterface, type TType, type TUnion } from 'tcomb';

import { nativeMediaSelectionValidator } from 'lib/types/media-types.js';
import { threadPermissionInfoValidator } from 'lib/types/thread-permission-types.js';
import { rawThreadInfoValidator } from 'lib/types/thread-types.js';
import { keyserverPrefixID, tID } from 'lib/utils/validation-utils.js';

import { main } from './utils.js';

function getDiscriminatorFieldForUnionValidator(validator: TType<mixed>) {
  if (validator === threadPermissionInfoValidator) {
    return 'value';
  }
  if (validator === nativeMediaSelectionValidator) {
    return 'step';
  }
  return 'type';
}

function flattenInnerUnionValidators<T>(
  unionValidator: TUnion<T>,
): TInterface<{ +[string]: mixed }>[] {
  let innerValidators = [];
  for (const innerValidator of unionValidator.meta.types) {
    if (innerValidator.meta.kind === 'interface') {
      const innerInterfaceValidator: TInterface<{ +[string]: mixed }> =
        (innerValidator: any);
      innerValidators.push(innerInterfaceValidator);
    } else if (innerValidator.meta.kind === 'union') {
      const innerUnionValidator: TUnion<mixed> = (innerValidator: any);
      innerValidators = [
        ...innerValidators,
        ...flattenInnerUnionValidators(innerUnionValidator),
      ];
    } else {
      throw new Error(
        `Validator not supported in union: ${innerValidator.displayName}`,
      );
    }
  }
  return innerValidators;
}

// `null` is returned if there is no conversion needed in T or any
// of it's inner types
function generateConverterFromValidator<T, C>(
  validator: TType<T>,
  inputName: string,
  validatorToBeConverted: TType<C>,
  conversionExpressionString: (inputName: string) => string,
): ?string {
  if (validator === validatorToBeConverted) {
    return `(${conversionExpressionString(inputName)})`;
  }

  if (validator.meta.kind === 'maybe') {
    const inner = generateConverterFromValidator(
      validator.meta.type,
      inputName,
      validatorToBeConverted,
      conversionExpressionString,
    );
    if (!inner) {
      return null;
    }
    return `((${inputName} !== null && ${inputName} !== undefined) ? (${inner}) : (${inputName}))`;
  }
  if (validator.meta.kind === 'subtype') {
    return generateConverterFromValidator(
      validator.meta.type,
      inputName,
      validatorToBeConverted,
      conversionExpressionString,
    );
  }
  if (validator.meta.kind === 'interface') {
    const recastValidator: TInterface<{ +[string]: mixed }> = (validator: any);
    const fieldConverters = [];
    for (const key in recastValidator.meta.props) {
      const inner = generateConverterFromValidator(
        recastValidator.meta.props[key],
        `${inputName}.${key}`,
        validatorToBeConverted,
        conversionExpressionString,
      );
      if (inner) {
        fieldConverters.push(`${key}:${inner}`);
      }
    }
    if (fieldConverters.length === 0) {
      return null;
    }

    return `({...${inputName}, ${fieldConverters.join(',')}})`;
  }
  if (validator.meta.kind === 'union') {
    const unionValidator: TUnion<T> = (validator: any);
    let flattenedInnerValidators = null;
    flattenedInnerValidators = flattenInnerUnionValidators(unionValidator);

    const variantConverters = [];
    for (const innerValidator of flattenedInnerValidators) {
      const discriminatorField =
        getDiscriminatorFieldForUnionValidator(validator);
      const discriminatorValidator: TType<mixed> =
        innerValidator.meta.props[discriminatorField];

      if (!discriminatorValidator) {
        throw new Error(
          'Union should have a discriminator ' + validator.displayName,
        );
      }

      const discriminator = discriminatorValidator.meta.name;

      const inner = generateConverterFromValidator(
        innerValidator,
        inputName,
        validatorToBeConverted,
        conversionExpressionString,
      );

      if (inner) {
        variantConverters.push(
          `(${inputName}.${discriminatorField} === ${discriminator}) ? (${inner})`,
        );
      }
    }
    if (variantConverters.length === 0) {
      return null;
    }
    variantConverters.push(`(${inputName})`);
    return `(${variantConverters.join(':')})`;
  }
  if (validator.meta.kind === 'list') {
    const inner = generateConverterFromValidator(
      validator.meta.type,
      'elem',
      validatorToBeConverted,
      conversionExpressionString,
    );
    if (!inner) {
      return inputName;
    }
    return `(${inputName}.map(elem => ${inner}))`;
  }
  if (validator.meta.kind === 'dict') {
    const domainValidator = validator.meta.domain;
    const codomainValidator = validator.meta.codomain;

    let domainConverter = null;
    if (domainValidator === validatorToBeConverted) {
      domainConverter = conversionExpressionString('key');
    }

    let codomainConverter = generateConverterFromValidator(
      codomainValidator,
      'value',
      validatorToBeConverted,
      conversionExpressionString,
    );

    if (!domainConverter && !codomainConverter) {
      return null;
    }

    domainConverter = domainConverter ?? 'key';
    codomainConverter = codomainConverter ?? 'value';

    return `(Object.fromEntries(
          entries(${inputName}).map(
            ([key, value]) => [${domainConverter}, ${codomainConverter}]
          )
        ))`;
  }

  return null;
}

// Input arguments:
const validator = rawThreadInfoValidator;
const typeName = 'RawThreadInfo';
const validatorToBeConverted = tID;
const conversionExpressionString = inputName =>
  `'${keyserverPrefixID}|' + ${inputName}`;
main([
  async () => {
    console.log(
      `export function convert${typeName}ToNewIDSchema(input: ${typeName}): ${typeName} { return`,
      generateConverterFromValidator(
        validator,
        'input',
        validatorToBeConverted,
        conversionExpressionString,
      ) ?? 'input',
      ';}',
    );
  },
]);
