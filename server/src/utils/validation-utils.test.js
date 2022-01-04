// @flow
import { serverUpdateInfoValidator, updateTypes } from 'lib/types/update-types';
import { exampleServerUpdates } from 'lib/types/validation.test';
import { tID } from 'lib/utils/validation-utils';

import { convertInput, convertIDSchema } from './validation-utils';

describe('ID schema conversion validation', () => {
  const updateTypesWithoutIDsToConvert = [
    updateTypes.BAD_DEVICE_TOKEN,
    updateTypes.DELETE_ACCOUNT,
    updateTypes.UPDATE_CURRENT_USER,
    updateTypes.UPDATE_USER,
  ];
  for (const initial of exampleServerUpdates) {
    const client = convertInput(
      serverUpdateInfoValidator,
      initial,
      [tID],
      convertIDSchema('server_to_client'),
    );
    const server = convertInput(
      serverUpdateInfoValidator,
      client,
      [tID],
      convertIDSchema('client_to_server'),
    );
    it(`Should convert server update of type ${initial.type} and convert back
    to initial object`, () => {
      expect(server).toEqual(initial);
    });
    if (!updateTypesWithoutIDsToConvert.includes(initial.type)) {
      it(`Should convert server update of type ${initial.type}
      to client ID schema`, () => {
        expect(initial).not.toEqual(client);
      });
    }
  }
});
