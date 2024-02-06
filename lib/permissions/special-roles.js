// @flow

import type { TRefinement } from 'tcomb';

import { values } from '../utils/objects.js';
import { tNumEnum } from '../utils/validation-utils.js';

export const specialRoles = Object.freeze({
  DEFAULT_ROLE: 1,
  ADMIN_ROLE: 2,
});

export type SpecialRole = $Values<typeof specialRoles>;
export const specialRoleValidator: TRefinement<number> = tNumEnum(
  values(specialRoles),
);

export const defaultSpecialRoles = Object.freeze({
  Members: specialRoles.DEFAULT_ROLE,
  Admins: specialRoles.ADMIN_ROLE,
});
