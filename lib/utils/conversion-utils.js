// @flow

import _mapKeys from 'lodash/fp/mapKeys.js';
import _mapValues from 'lodash/fp/mapValues.js';
import type { TInterface, TType } from 'tcomb';

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

function createOptimizedConvertObject<T, I, Args>(
  validator: TType<I>,
  typesToConvert: $ReadOnlyArray<TType<T>>,
  conversionFunction: (T, Args) => T,
): ?(I, Args) => I {
  if (typesToConvert.includes(validator)) {
    return (input, args) => {
      if (validator.is(input)) {
        // $FlowFixMe Inside the if we know that T == I
        return conversionFunction(input, args);
      } else {
        return input;
      }
    };
  }

  if (validator.meta.kind === 'maybe' || validator.meta.kind === 'subtype') {
    return createOptimizedConvertObject(
      validator.meta.type,
      typesToConvert,
      conversionFunction,
    );
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
        // $FlowFixMe
        conversionFunction,
      );
      if (innerValidator) {
        result[key] = innerValidatorF;
      }
    }

    if (Object.keys(result).length === 0) {
      return null;
    }

    return (input, args) => {
      const output = { ...input };
      for (const key in result) {
        output[key] = result[key](output[key], args);
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
        conversionFunction,
      );
      if (innerValidatorF) {
        result.push([innerValidator, innerValidatorF]);
      }
    }

    if (result.length === 0) {
      return null;
    }

    return (input, args) => {
      for (const [innerValidator, innerValidatorF] of result) {
        if (innerValidator.is(input)) {
          return innerValidatorF(input, args);
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
      conversionFunction,
    );
    if (!innerValidatorF) {
      return null;
    }
    // $FlowFixMe
    return (input, args) => input.map(v => innerValidatorF(v, args));
  }

  if (validator.meta.kind === 'dict') {
    const domainValidator = validator.meta.domain;
    const codomainValidator = validator.meta.codomain;
    const domainValidatorF = createOptimizedConvertObject(
      domainValidator,
      typesToConvert,
      conversionFunction,
    );
    const codomainValidatorF = createOptimizedConvertObject(
      codomainValidator,
      typesToConvert,
      conversionFunction,
    );

    if (!domainValidator && !codomainValidator) {
      return null;
    }

    return (input, args) =>
      // $FlowFixMe
      _mapValues(v => codomainValidatorF(v, args))(
        // $FlowFixMe
        _mapKeys(k => domainValidatorF(k, args))(input),
      );
  }

  return null;
}

export {
  convertClientIDsToServerIDs,
  convertServerIDsToClientIDs,
  convertObject,
  createOptimizedConvertObject,
};
