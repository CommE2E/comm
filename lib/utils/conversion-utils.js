// @flow

import _mapKeys from 'lodash/fp/mapKeys.js';
import _mapValues from 'lodash/fp/mapValues.js';
import type { TInterface, TType } from 'tcomb';

import { convertIDToNewSchema } from './migration-utils.js';
import {
  assertWithValidator,
  tID,
  tUserID,
  tFarcasterID,
} from './validation-utils.js';
import {
  getPendingThreadID,
  parsePendingThreadID,
} from '../shared/thread-utils.js';

function convertServerIDsToClientIDs<T>(
  serverPrefixID: string,
  outputValidator: TType<T>,
  data: T,
): T {
  const conversionFunction = (id: string) => {
    if (id.indexOf('|') !== -1) {
      console.warn(`Server id '${id}' already has a prefix`);
      return id;
    }
    return convertIDToNewSchema(id, serverPrefixID);
  };

  return convertObject(outputValidator, data, [tID], conversionFunction);
}

function convertClientIDsToServerIDs<T>(
  serverPrefixID: string,
  outputValidator: TType<T>,
  data: T,
): T {
  const prefix = serverPrefixID + '|';
  const conversionFunction = (id: string) => {
    if (id.startsWith(prefix)) {
      return id.substr(prefix.length);
    }

    const pendingIDContents = parsePendingThreadID(id);
    if (!pendingIDContents) {
      throw new Error('invalid_client_id_prefix');
    }

    if (!pendingIDContents.sourceMessageID) {
      return id;
    }

    return getPendingThreadID(
      pendingIDContents.threadType,
      pendingIDContents.memberIDs,
      pendingIDContents.sourceMessageID.substr(prefix.length),
    );
  };

  return convertObject(outputValidator, data, [tID], conversionFunction);
}

function extractUserIDsFromPayload<T>(
  outputValidator: TType<T>,
  data: T,
): $ReadOnlyArray<string> {
  return extractIDsFromPayload(outputValidator, data, tUserID);
}

function extractFarcasterIDsFromPayload<T>(
  outputValidator: TType<T>,
  data: T,
): $ReadOnlyArray<number> {
  return extractIDsFromPayload(outputValidator, data, tFarcasterID);
}

function extractIDsFromPayload<T, U>(
  outputValidator: TType<T>,
  data: T,
  extractedType: TType<U>,
): $ReadOnlyArray<U> {
  const result = new Set<U>();
  const conversionFunction = (id: U) => {
    result.add(id);
    return id;
  };

  try {
    convertObject(outputValidator, data, [extractedType], conversionFunction);
  } catch {}

  return [...result];
}

type ConvertObjectOptions = {
  +dontValidateInput?: ?boolean,
};
function convertObject<T, I>(
  validator: TType<I>,
  input: I,
  typesToConvert: $ReadOnlyArray<TType<T>>,
  conversionFunction: T => T,
  options?: ?ConvertObjectOptions,
): I {
  if (input === null || input === undefined) {
    return input;
  }
  const dontValidateInput = options?.dontValidateInput;

  // While they should be the same runtime object,
  // `tValidator` is `TType<T>` and `validator` is `TType<I>`.
  // Having them have different types allows us to use `assertWithValidator`
  // to change `input` flow type
  const tValidator = typesToConvert[typesToConvert.indexOf(validator)];
  if (tValidator && tValidator.is(input)) {
    const tInput = assertWithValidator(input, tValidator);
    const converted = conversionFunction(tInput);
    return assertWithValidator(converted, validator);
  }

  if (validator.meta.kind === 'maybe' || validator.meta.kind === 'subtype') {
    return convertObject(
      validator.meta.type,
      input,
      typesToConvert,
      conversionFunction,
      options,
    );
  }
  if (validator.meta.kind === 'interface' && typeof input === 'object') {
    const recastValidator: TInterface<typeof input> = (validator: any);
    const result: { [string]: mixed } = {};
    for (const key in input) {
      const innerValidator = recastValidator.meta.props[key];
      result[key] = convertObject(
        innerValidator,
        input[key],
        typesToConvert,
        conversionFunction,
        options,
      );
    }
    if (dontValidateInput) {
      return (result: any);
    } else {
      return assertWithValidator(result, recastValidator);
    }
  }
  if (validator.meta.kind === 'union') {
    for (const innerValidator of validator.meta.types) {
      if (innerValidator.is(input)) {
        return convertObject(
          innerValidator,
          input,
          typesToConvert,
          conversionFunction,
          options,
        );
      }
    }
    return input;
  }
  if (validator.meta.kind === 'list' && Array.isArray(input)) {
    const innerValidator = validator.meta.type;
    return (input.map(value =>
      convertObject(
        innerValidator,
        value,
        typesToConvert,
        conversionFunction,
        options,
      ),
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
        options,
      ),
    )(input);
  }

  return input;
}

// NOTE: This function should not be called from native. On native, we should
// use `convertObjToBytes` in native/backup/conversion-utils.js instead.
function convertObjToBytes<T>(obj: T): Uint8Array {
  const objStr = JSON.stringify(obj);
  return new TextEncoder().encode(objStr ?? '');
}

// NOTE: This function should not be called from native. On native, we should
// use `convertBytesToObj` in native/backup/conversion-utils.js instead.
function convertBytesToObj<T>(bytes: Uint8Array): T {
  const str = new TextDecoder().decode(bytes.buffer);
  return JSON.parse(str);
}

export {
  convertClientIDsToServerIDs,
  convertServerIDsToClientIDs,
  extractUserIDsFromPayload,
  extractFarcasterIDsFromPayload,
  convertObject,
  convertObjToBytes,
  convertBytesToObj,
};
