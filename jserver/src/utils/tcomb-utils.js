// @flow

import t from 'tcomb';

function tBool(value: bool) {
  return t.irreducible('true', x => x === value);
}

function tShape(spec: *) {
  return t.interface(spec, { strict: true });
}

function tRegex(regex: RegExp) {
  return t.refinement(t.String, val => regex.test(val));
}

const tDate = tRegex(/^[0-9]{4}-[0-1][0-9]-[0-3][0-9]$/);

export {
  tBool,
  tShape,
  tRegex,
  tDate,
};
