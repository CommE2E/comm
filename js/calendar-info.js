// @flow

import React from 'react';
import invariant from 'invariant';

export type VisibilityRules = 0 | 1 | 2;
export const visibilityRules: {[name: string]: VisibilityRules} = {
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
export const editRules: {[name: string]: EditRules} = {
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

export type CalendarInfo = {
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

export const calendarInfoPropType = React.PropTypes.shape({
  id: React.PropTypes.string.isRequired,
  name: React.PropTypes.string.isRequired,
  description: React.PropTypes.string.isRequired,
  authorized: React.PropTypes.bool.isRequired,
  subscribed: React.PropTypes.bool.isRequired,
  canChangeSettings: React.PropTypes.bool.isRequired,
  visibilityRules: React.PropTypes.oneOf([
    0, 1, 2,
  ]).isRequired,
  color: React.PropTypes.string.isRequired,
  editRules: React.PropTypes.oneOf([
    0, 1,
  ]).isRequired,
});
