// @flow

export const specialRoles = Object.freeze({
  DEFAULT_ROLE: 1,
  ADMIN_ROLE: 2,
});

export const defaultSpecialRoles = Object.freeze({
  Members: specialRoles.DEFAULT_ROLE,
  Admins: specialRoles.ADMIN_ROLE,
});
