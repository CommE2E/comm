// @flow

import invariant from 'invariant';
import t from 'tcomb';

import {
  convertServerIDsToClientIDs,
  convertClientIDsToServerIDs,
} from './conversion-utils.js';
import { tShape, tID, idSchemaRegex } from './validation-utils.js';

describe('id conversion', () => {
  it('should convert string id', () => {
    const validator = tShape({ id: tID });
    const serverData = { id: '1' };
    const clientData = { id: '0|1' };

    expect(
      convertServerIDsToClientIDs('0', validator, serverData),
    ).toStrictEqual(clientData);
    expect(
      convertClientIDsToServerIDs('0', validator, clientData),
    ).toStrictEqual(serverData);
  });

  it('should convert a complex type', () => {
    const validator = tShape({ ids: t.dict(tID, t.list(tID)) });
    const serverData = { ids: { '1': ['11', '12'], '2': [], '3': ['13'] } };
    const clientData = {
      ids: { '0|1': ['0|11', '0|12'], '0|2': [], '0|3': ['0|13'] },
    };

    expect(
      convertServerIDsToClientIDs('0', validator, serverData),
    ).toStrictEqual(clientData);
    expect(
      convertClientIDsToServerIDs('0', validator, clientData),
    ).toStrictEqual(serverData);
  });

  it('should convert a refinement', () => {
    const validator = t.refinement(tID, () => true);
    const serverData = '1';
    const clientData = '0|1';

    expect(
      convertServerIDsToClientIDs('0', validator, serverData),
    ).toStrictEqual(clientData);
    expect(
      convertClientIDsToServerIDs('0', validator, clientData),
    ).toStrictEqual(serverData);
  });
});

describe('idSchemaRegex tests', () => {
  it('should capture ids', () => {
    const regex = new RegExp(`^(${idSchemaRegex})$`);
    const ids = ['123|123', '0|0', '123', '0'];

    for (const id of ids) {
      const result = regex.exec(id);
      expect(result).not.toBeNull();
      invariant(result, 'result is not null');
      const matches = [...result];
      expect(matches).toHaveLength(2);
      expect(matches[1]).toBe(id);
    }
  });
});
