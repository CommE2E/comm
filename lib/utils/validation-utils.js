// @flow

import invariant from 'invariant';
import _mapKeys from 'lodash/fp/mapKeys.js';
import _mapValues from 'lodash/fp/mapValues.js';
import t from 'tcomb';
import type {
  TStructProps,
  TIrreducible,
  TRefinement,
  TEnums,
  TInterface,
  TUnion,
  TType,
} from 'tcomb';

import {
  validEmailRegex,
  oldValidUsernameRegex,
  validHexColorRegex,
} from '../shared/account-utils.js';
import type { PlatformDetails } from '../types/device-types';
import type {
  MediaMessageServerDBContent,
  PhotoMessageServerDBContent,
  VideoMessageServerDBContent,
} from '../types/messages/media';

function tBool(value: boolean): TIrreducible<boolean> {
  return t.irreducible(value.toString(), x => x === value);
}

function tString(value: string): TIrreducible<string> {
  return t.irreducible(`'${value}'`, x => x === value);
}

function tNumber(value: number): TIrreducible<number> {
  return t.irreducible(value.toString(), x => x === value);
}

function tShape<T>(spec: TStructProps<T>): TInterface<T> {
  return t.interface(spec, { strict: true });
}

type TRegex = TRefinement<string>;
function tRegex(regex: RegExp): TRegex {
  return t.refinement(t.String, val => regex.test(val));
}

function tNumEnum(nums: $ReadOnlyArray<number>): TRefinement<number> {
  return t.refinement(t.Number, (input: number) => {
    for (const num of nums) {
      if (input === num) {
        return true;
      }
    }
    return false;
  });
}
const tNull: TIrreducible<null> = t.irreducible('null', x => x === null);
const tDate: TRegex = tRegex(/^[0-9]{4}-[0-1][0-9]-[0-3][0-9]$/);
const tColor: TRegex = tRegex(validHexColorRegex); // we don't include # char
const tPlatform: TEnums = t.enums.of([
  'ios',
  'android',
  'web',
  'windows',
  'macos',
]);
const tDeviceType: TEnums = t.enums.of(['ios', 'android']);
const tPlatformDetails: TInterface<PlatformDetails> = tShape({
  platform: tPlatform,
  codeVersion: t.maybe(t.Number),
  stateVersion: t.maybe(t.Number),
});
const tPassword: TRefinement<string> = t.refinement(
  t.String,
  (password: string) => !!password,
);
const tCookie: TRegex = tRegex(/^(user|anonymous)=[0-9]+:[0-9a-f]+$/);
const tEmail: TRegex = tRegex(validEmailRegex);
const tOldValidUsername: TRegex = tRegex(oldValidUsernameRegex);
const tID: TRefinement<string> = t.refinement(t.String, (id: string) => !!id);

const tMediaMessagePhoto: TInterface<PhotoMessageServerDBContent> = tShape({
  type: tString('photo'),
  uploadID: tID,
});

const tMediaMessageVideo: TInterface<VideoMessageServerDBContent> = tShape({
  type: tString('video'),
  uploadID: tID,
  thumbnailUploadID: tID,
});

const tMediaMessageMedia: TUnion<MediaMessageServerDBContent> = t.union([
  tMediaMessagePhoto,
  tMediaMessageVideo,
]);

function assertWithValidator<T>(data: mixed, validator: TType<T>): T {
  invariant(validator.is(data), "data isn't of type T");
  return (data: any);
}

const ashoatKeyserverID = '256';

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

export {
  tBool,
  tString,
  tNumber,
  tShape,
  tRegex,
  tNumEnum,
  tNull,
  tDate,
  tColor,
  tPlatform,
  tDeviceType,
  tPlatformDetails,
  tPassword,
  tCookie,
  tEmail,
  tOldValidUsername,
  tID,
  tMediaMessagePhoto,
  tMediaMessageVideo,
  tMediaMessageMedia,
  assertWithValidator,
  ashoatKeyserverID,
  convertClientIDsToServerIDs,
  convertServerIDsToClientIDs,
  convertObject,
};
