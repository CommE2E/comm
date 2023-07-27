// @flow

import { constructRoleDeletionMessagePrompt } from './role-utils.js';

describe('constructRoleDeletionMessagePrompt', () => {
  it('should return generic deletion message if no members have this role', () => {
    const result = constructRoleDeletionMessagePrompt('defaultRole', 0);
    expect(result).toBe('Are you sure you want to delete this role?');
  });

  it('should correctly format message for single member', () => {
    const result = constructRoleDeletionMessagePrompt('defaultRole', 1);
    expect(result).toBe(
      `There is currently 1 member with this role. Deleting the role will ` +
        `automatically assign the member affected to the defaultRole role.`,
    );
  });

  it('should correctly format message for multiple members', () => {
    const result = constructRoleDeletionMessagePrompt('defaultRole', 5);
    expect(result).toBe(
      `There are currently 5 members with this role. Deleting the role will ` +
        `automatically assign the members affected to the defaultRole role.`,
    );
  });

  it('should correctly incorporate the name of the default role', () => {
    const result = constructRoleDeletionMessagePrompt('testRole', 5);
    expect(result).toBe(
      `There are currently 5 members with this role. Deleting the role will ` +
        `automatically assign the members affected to the testRole role.`,
    );
  });
});
