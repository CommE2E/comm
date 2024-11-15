// @flow

import t, { type TInterface, type TType } from 'tcomb';

import {
  nativeMediaSelectionValidator,
  mediaValidator,
} from 'lib/types/media-types.js';
import { threadPermissionInfoValidator } from 'lib/types/thread-permission-types.js';
import { legacyThinRawThreadInfoValidator } from 'lib/types/thread-types.js';
import { ashoatKeyserverID, tID } from 'lib/utils/validation-utils.js';

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
  innerValidators: $ReadOnlyArray<TType<T>>,
): TInterface<{ +[string]: mixed }>[] {
  let result: TInterface<{ +[string]: mixed }>[] = [];
  for (const innerValidator of innerValidators) {
    if (innerValidator.meta.kind === 'interface') {
      // In flow, union refinement only works if every variant has a key
      // that is a literal. In this case we don't get a refinement of
      // `innerValidator` because we are checking value of the inner
      // `meta` object.
      const recastValidator: TInterface<{ +[string]: mixed }> =
        (innerValidator: any);
      result.push(recastValidator);
    } else if (innerValidator.meta.kind === 'union') {
      result = [
        ...result,
        ...flattenInnerUnionValidators(innerValidator.meta.types),
      ];
    } else if ([t.String, t.Number, t.Boolean].includes(innerValidator)) {
      // We don't need to handle literal types because they can't be
      // converted
    } else {
      throw new Error(
        `Validator not supported in union: ${innerValidator.displayName}`,
      );
    }
  }
  return result;
}

// MediaValidator is special cased because of flow issues
function getConverterForMediaValidator(inputName: string) {
  return `(${inputName}.type === 'photo'
  ? { ...${inputName}, id: '256|' + ${inputName}.id }
  : ${inputName}.type === 'video'
  ? {
      ...${inputName},
      id: '256|' + ${inputName}.id,
      thumbnailID: '256|' + ${inputName}.thumbnailID,
    }
  : ${inputName}.type === 'encrypted_photo'
  ? ({ ...${inputName}, id: '256|' + ${inputName}.id }: any)
  : ${inputName}.type === 'encrypted_video'
  ? ({
      ...${inputName},
      id: '256|' + ${inputName}.id,
      thumbnailID: '256|' + ${inputName}.thumbnailID,
    }: any)
  : ${inputName})`;
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
  } else if (validator === mediaValidator) {
    return getConverterForMediaValidator(inputName);
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
    // In flow, union refinement only works if every variant has a key
    // that is a literal. In this case we don't get a refinement of `validator`
    // because we are checking value of the inner `meta` object.
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
    const innerValidators = flattenInnerUnionValidators(validator.meta.types);

    const variantConverters = [];
    for (const innerValidator of innerValidators) {
      const discriminatorField =
        getDiscriminatorFieldForUnionValidator(validator);
      const discriminatorValidator =
        innerValidator.meta.props[discriminatorField];

      if (!discriminatorValidator) {
        throw new Error(
          'Union should have a discriminator ' + validator.displayName,
        );
      }

      const discriminatorValue = discriminatorValidator.meta.name;

      const inner = generateConverterFromValidator(
        innerValidator,
        inputName,
        validatorToBeConverted,
        conversionExpressionString,
      );

      if (inner) {
        variantConverters.push(
          `(${inputName}.${discriminatorField} === ${discriminatorValue}) ? (${inner})`,
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
const validator = legacyThinRawThreadInfoValidator;
const typeName = 'RawThreadInfo';
const validatorToBeConverted = tID;
const conversionExpressionString = (inputName: string) =>
  `'${ashoatKeyserverID}|' + ${inputName}`;
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
