// @flow

import Module from '../_generated/CommQueryCreator.js';

const TEST_USER_ID_KEY = 'current_user_id';
const TEST_USER_ID_VAL = 'qwerty1234';

describe('Metadata queries', () => {
  let instance;

  beforeAll(async () => {
    const module = Module();
    instance = new module.CommQueryCreator('test.sqlite');
  });

  beforeEach(() => {
    instance.setMetadata(TEST_USER_ID_KEY, TEST_USER_ID_VAL);
  });

  afterEach(() => {
    instance.clearMetadata(TEST_USER_ID_KEY);
  });

  it('should return the data of an existing name', () => {
    expect(instance.getMetadata(TEST_USER_ID_KEY)).toBe(TEST_USER_ID_VAL);
  });

  // FIXME this returns empty string
  // it('should return undefined for a non-existing name', () => {
  //   const nonExistingName = 'non_existing_name';
  //   expect(instance.getMetadata(nonExistingName)).toBeUndefined();
  // });

  it('should set the data of an existing name', () => {
    const newUserID = 'newID123';
    instance.setMetadata(TEST_USER_ID_KEY, newUserID);
    expect(instance.getMetadata(TEST_USER_ID_KEY)).toBe(newUserID);
  });

  it('should set the data of a non-existing name', () => {
    const newEntry = 'testEntry';
    const newData = 'testData';
    instance.setMetadata(newEntry, newData);
    expect(instance.getMetadata(newEntry)).toBe(newData);
    expect(instance.getMetadata(TEST_USER_ID_KEY)).toBe(TEST_USER_ID_VAL);
  });

  // FIXME this returns empty string not undefined
  // it('should clear an existing entry', () => {
  //   instance.clearMetadata(TEST_USER_ID_KEY);
  //   expect(instance.getMetadata(TEST_USER_ID_KEY)).toBeUndefined();
  // });
  //
  // it('should do nothing when clearing a non-existing entry', () => {
  //   const nonExistingName = 'non_existing_name';
  //   clearMetadata(db, nonExistingName);
  //   expect(getMetadata(db, nonExistingName)).toBeUndefined();
  //   expect(getMetadata(db, TEST_USER_ID_KEY)).toBe(TEST_USER_ID_VAL);
  // });
});
