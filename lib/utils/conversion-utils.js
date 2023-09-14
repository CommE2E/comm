// @flow

import _mapKeys from 'lodash/fp/mapKeys.js';
import _mapValues from 'lodash/fp/mapValues.js';
import type { TInterface, TType } from 'tcomb';

import memoize2 from './memoize.js';
import { assertWithValidator, tID } from './validation-utils.js';

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

function createOptimizedConvertObject<I, T, Args, F: (T, ...Args) => T>(
  validator: TType<I>,
  typesToConvert: $ReadOnlyArray<TType<T>>,
): ?(I, F) => I {
  if (typesToConvert.includes(validator)) {
    // $FlowFixMe Inside the if we know that T == I
    return (input, conversionFunction) => conversionFunction(input);
  }

  if (validator.meta.kind === 'subtype') {
    return createOptimizedConvertObject(validator.meta.type, typesToConvert);
  }

  if (validator.meta.kind === 'maybe') {
    const innerValidatorF = createOptimizedConvertObject(
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
      const innerValidatorF = createOptimizedConvertObject(
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
    const result = [];
    for (const innerValidator of validator.meta.types) {
      const innerValidatorF = createOptimizedConvertObject(
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

  if (validator.meta.kind === 'list') {
    const innerValidator = validator.meta.type;
    const innerValidatorF = createOptimizedConvertObject(
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
    const domainValidatorF = createOptimizedConvertObject(
      domainValidator,
      typesToConvert,
    );
    const codomainValidatorF = createOptimizedConvertObject(
      codomainValidator,
      typesToConvert,
    );

    return (input, conversionFunction) => {
      let output = input;
      if (domainValidatorF) {
        output = _mapKeys(k => domainValidatorF(k, conversionFunction))(output);
      }
      if (codomainValidatorF) {
        output = _mapValues(k => codomainValidatorF(k, conversionFunction))(
          output,
        );
      }
      return output;
    };
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
