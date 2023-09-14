// @flow

import _mapKeys from 'lodash/fp/mapKeys.js';
import _mapValues from 'lodash/fp/mapValues.js';
import t, { type TInterface, type TType } from 'tcomb';

import memoize2 from './memoize.js';
import { entries } from './objects.js';
import { assertWithValidator, tID } from './validation-utils.js';
import { nativeMediaSelectionValidator } from '../types/media-types.js';
import { threadPermissionInfoValidator } from '../types/thread-permission-types.js';
import { currentUserInfoValidator } from '../types/user-types.js';

function convertServerIDsToClientIDs<T>(
  serverPrefixID: string,
  outputValidator: TType<T>,
  data: T,
): T {
  const conversionFunction = id => {
    if (id.indexOf('|') !== -1) {
      console.warn(`Server id '${id}' already has a prefix`);
      return id;
    }
    return `${serverPrefixID}|${id}`;
  };

  return convertObject(outputValidator, data, [tID], conversionFunction);
}

function convertClientIDsToServerIDs<T>(
  serverPrefixID: string,
  outputValidator: TType<T>,
  data: T,
): T {
  const prefix = serverPrefixID + '|';
  const conversionFunction = id => {
    if (id.startsWith(prefix)) {
      return id.substr(prefix.length);
    }

    throw new Error('invalid_client_id_prefix');
  };

  return convertObject(outputValidator, data, [tID], conversionFunction);
}

function convertObject<T, I>(
  validator: TType<I>,
  input: I,
  typesToConvert: $ReadOnlyArray<TType<T>>,
  conversionFunction: T => T,
): I {
  if (input === null || input === undefined) {
    return input;
  }

  // While they should be the same runtime object,
  // `TValidator` is `TType<T>` and `validator` is `TType<I>`.
  // Having them have different types allows us to use `assertWithValidator`
  // to change `input` flow type
  const TValidator = typesToConvert[typesToConvert.indexOf(validator)];
  if (TValidator && TValidator.is(input)) {
    const TInput = assertWithValidator(input, TValidator);
    const converted = conversionFunction(TInput);
    return assertWithValidator(converted, validator);
  }

  if (validator.meta.kind === 'maybe' || validator.meta.kind === 'subtype') {
    return convertObject(
      validator.meta.type,
      input,
      typesToConvert,
      conversionFunction,
    );
  }
  if (validator.meta.kind === 'interface' && typeof input === 'object') {
    const recastValidator: TInterface<typeof input> = (validator: any);
    const result = {};
    for (const key in input) {
      const innerValidator = recastValidator.meta.props[key];
      result[key] = convertObject(
        innerValidator,
        input[key],
        typesToConvert,
        conversionFunction,
      );
    }
    return assertWithValidator(result, recastValidator);
  }
  if (validator.meta.kind === 'union') {
    for (const innerValidator of validator.meta.types) {
      if (innerValidator.is(input)) {
        return convertObject(
          innerValidator,
          input,
          typesToConvert,
          conversionFunction,
        );
      }
    }
    return input;
  }
  if (validator.meta.kind === 'list' && Array.isArray(input)) {
    const innerValidator = validator.meta.type;
    return (input.map(value =>
      convertObject(innerValidator, value, typesToConvert, conversionFunction),
    ): any);
  }
  if (validator.meta.kind === 'dict' && typeof input === 'object') {
    const domainValidator = validator.meta.domain;
    const codomainValidator = validator.meta.codomain;
    if (typesToConvert.includes(domainValidator)) {
      input = _mapKeys(key => conversionFunction(key))(input);
    }
    return _mapValues(value =>
      convertObject(
        codomainValidator,
        value,
        typesToConvert,
        conversionFunction,
      ),
    )(input);
  }

  return input;
}

function getDiscriminatorFieldForUnionValidator(
  validator: TType<mixed>,
): ?string {
  if (validator === threadPermissionInfoValidator) {
    return 'value';
  }
  if (validator === nativeMediaSelectionValidator) {
    return 'step';
  }
  if (validator === currentUserInfoValidator) {
    return null;
  }
  return 'type';
}

function flattenInnerUnionValidators<T>(
  innerValidators: $ReadOnlyArray<TType<T>>,
): TInterface<{ +[string]: mixed }>[] {
  let result = [];
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

function createOptimizedConvertObject<I, T, Args, F: (T, ...Args) => T>(
  validator: TType<I>,
  typesToConvert: $ReadOnlyArray<TType<T>>,
): ?(I, F) => I {
  if (typesToConvert.includes(validator)) {
    // $FlowFixMe Inside the if we know that T == I
    return (input, conversionFunction) => conversionFunction(input);
  }

  if (validator.meta.kind === 'subtype') {
    return memoizedCreateOptimizedConvertObject(
      validator.meta.type,
      typesToConvert,
    );
  }

  if (validator.meta.kind === 'maybe') {
    const innerValidatorF = memoizedCreateOptimizedConvertObject(
      validator.meta.type,
      typesToConvert,
    );
    if (!innerValidatorF) {
      return null;
    }
    return (input, conversionFunction) => {
      return input !== null && input !== undefined
        ? innerValidatorF(input, conversionFunction)
        : input;
    };
  }

  if (validator.meta.kind === 'interface') {
    // $FlowFixMe
    const interfaceValidator: TInterface<I> = validator;
    const result = {};
    for (const key in interfaceValidator.meta.props) {
      const innerValidator = interfaceValidator.meta.props[key];
      const innerValidatorF = memoizedCreateOptimizedConvertObject(
        innerValidator,
        typesToConvert,
      );
      if (innerValidatorF) {
        result[key] = innerValidatorF;
      }
    }

    if (Object.keys(result).length === 0) {
      return null;
    }

    return (input, conversionFunction) => {
      const output = { ...input };
      for (const key in result) {
        output[key] = result[key](output[key], conversionFunction);
      }
      return output;
    };
  }

  if (validator.meta.kind === 'union') {
    const types = validator.meta.types;
    const innerValidators = flattenInnerUnionValidators(types);
    const discriminatorField =
      getDiscriminatorFieldForUnionValidator(validator);

    if (!discriminatorField) {
      const result = [];
      for (const innerValidator of types) {
        const innerValidatorF = memoizedCreateOptimizedConvertObject(
          innerValidator,
          typesToConvert,
        );
        if (innerValidatorF) {
          result.push([innerValidator, innerValidatorF]);
        }
      }

      if (result.length === 0) {
        return null;
      }

      return (input, conversionFunction) => {
        for (const [innerValidator, innerValidatorF] of result) {
          if (innerValidator.is(input)) {
            return innerValidatorF(input, conversionFunction);
          }
        }
        return input;
      };
    }

    const variantConverters = [];
    for (const innerValidator of innerValidators) {
      const discriminatorValidator =
        innerValidator.meta.props[discriminatorField];

      if (!discriminatorValidator) {
        throw new Error(
          'Union should have a discriminator ' + validator.displayName,
        );
      }

      const discriminatorValue = discriminatorValidator.meta.name;

      const innerValidatorF = memoizedCreateOptimizedConvertObject(
        innerValidator,
        typesToConvert,
      );

      if (innerValidatorF) {
        variantConverters.push([discriminatorValue, innerValidatorF]);
      }
    }

    if (variantConverters.length === 0) {
      return null;
    }

    return (input, conversionFunction) => {
      // $FlowFixMe
      const inputDiscriminatorValue = input[discriminatorField].toString();
      for (const [discriminatorValue, innerValidatorF] of variantConverters) {
        if (inputDiscriminatorValue === discriminatorValue) {
          // $FlowFixMe
          return innerValidatorF(input, conversionFunction);
        }
      }
      return input;
    };
  }

  if (validator.meta.kind === 'list') {
    const innerValidator = validator.meta.type;
    const innerValidatorF = memoizedCreateOptimizedConvertObject(
      innerValidator,
      typesToConvert,
    );
    if (!innerValidatorF) {
      return null;
    }
    return (input, conversionFunction) =>
      // $FlowFixMe
      input.map(v => innerValidatorF(v, conversionFunction));
  }

  if (validator.meta.kind === 'dict') {
    const domainValidator = validator.meta.domain;
    const codomainValidator = validator.meta.codomain;
    const domainValidatorF = memoizedCreateOptimizedConvertObject(
      domainValidator,
      typesToConvert,
    );
    const codomainValidatorF = memoizedCreateOptimizedConvertObject(
      codomainValidator,
      typesToConvert,
    );

    if (domainValidatorF && codomainValidatorF) {
      return (input, conversionFunction) => {
        // $FlowFixMe
        return Object.fromEntries(
          // $FlowFixMe
          entries(input).map(([k, v]) => [
            domainValidatorF(k, conversionFunction),
            codomainValidatorF(v, conversionFunction),
          ]),
        );
      };
    } else if (domainValidatorF) {
      return (input, conversionFunction) =>
        _mapKeys(k => domainValidatorF(k, conversionFunction))(input);
    } else if (codomainValidatorF) {
      return (input, conversionFunction) =>
        _mapValues(v => codomainValidatorF(v, conversionFunction))(input);
    } else {
      return null;
    }
  }

  return null;
}

const memoizedCreateOptimizedConvertObject: <I, T, Args, F: (T, ...Args) => T>(
  validator: TType<I>,
  typesToConvert: $ReadOnlyArray<TType<T>>,
) => ?(I, F) => I = memoize2(createOptimizedConvertObject);

export {
  convertClientIDsToServerIDs,
  convertServerIDsToClientIDs,
  convertObject,
  createOptimizedConvertObject,
  memoizedCreateOptimizedConvertObject,
};
