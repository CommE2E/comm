// @flow

import { serverUpdateInfoValidator } from 'lib/types/update-types';
import { exampleServerUpdates } from 'lib/types/validation.test';

import { convertIDSchema } from './validation-utils';

describe('ID schema conversion validation', () => {
  for (const initial of exampleServerUpdates) {
    it(`Should convert server update of type ${initial.type}`, () => {
      const client = convertIDSchema(serverUpdateInfoValidator, initial, true);
      const server = convertIDSchema(serverUpdateInfoValidator, client, false);

      expect(server).toEqual(initial);
    });
  }
});
