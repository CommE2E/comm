// @flow

import PropTypes from 'prop-types';
import invariant from 'invariant';

export type VisibilityRules = 0 | 1 | 2;
export const visibilityRules = {
  OPEN: 0,
  CLOSED: 1,
  SECRET: 2,
};
export function assertVisibilityRules(
  ourVisibilityRules: number,
): VisibilityRules {
  invariant(
    ourVisibilityRules === 0 ||
      ourVisibilityRules === 1 ||
      ourVisibilityRules === 2,
    "number is not visibilityRules enum",
  );
  return ourVisibilityRules;
}

export type EditRules = 0 | 1;
export const editRules = {
  ANYBODY: 0,
  LOGGED_IN: 1,
};
export function assertEditRules(
  ourEditRules: number,
): EditRules {
  invariant(
    ourEditRules === 0 ||
      ourEditRules === 1,
    "number is not editRules enum",
  );
  return ourEditRules;
}

export type ThreadInfo = {
  id: string,
  name: string,
  description: string,
  authorized: bool,
  subscribed: bool,
  canChangeSettings: bool,
  visibilityRules: VisibilityRules,
  color: string, // hex, without "#" or "0x"
  editRules: EditRules,
}

export const threadInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  authorized: PropTypes.bool.isRequired,
  subscribed: PropTypes.bool.isRequired,
  canChangeSettings: PropTypes.bool.isRequired,
  visibilityRules: PropTypes.oneOf([
    0, 1, 2,
  ]).isRequired,
  color: PropTypes.string.isRequired,
  editRules: PropTypes.oneOf([
    0, 1,
  ]).isRequired,
});
