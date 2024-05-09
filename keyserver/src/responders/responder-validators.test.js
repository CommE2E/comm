// @flow

import { roleChangeRequestInputValidator } from './thread-responders.js';

describe('thread responders', () => {
  it('should validate role change request input', () => {
    const input = {
      threadID: '123',
      memberIDs: [],
      role: '1',
    };

    expect(roleChangeRequestInputValidator.is(input)).toBe(true);
    expect(roleChangeRequestInputValidator.is({ ...input, role: '2|1' })).toBe(
      true,
    );
    expect(roleChangeRequestInputValidator.is({ ...input, role: '-1' })).toBe(
      false,
    );
    expect(roleChangeRequestInputValidator.is({ ...input, role: '2|-1' })).toBe(
      false,
    );
  });
});
