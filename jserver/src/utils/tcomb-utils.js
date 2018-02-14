// @flow

import t from 'tcomb';

function tBool(value: bool) {
  return t.irreducible('true', x => x === value);
}

function tShape(spec: *) {
  return t.interface(spec, { strict: true });
}

export {
  tBool,
  tShape,
};
