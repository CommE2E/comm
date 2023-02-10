// @flow

import { ET } from './entity-text.js';

const someUserEntity = {
  type: 'user',
  id: '123',
  username: 'hello',
};

const someThreadEntity = {
  type: 'thread',
  id: '456',
  display: 'uiName',
  name: undefined,
  uiName: 'this is a thread',
};

describe('ET tag function', () => {
  it('should compose', () => {
    const first = ET`${someUserEntity} created ${someThreadEntity}`;
    const second = ET`${someUserEntity} sent a message: ${first}`;
    expect(second.length).toBe(5);
  });
});
