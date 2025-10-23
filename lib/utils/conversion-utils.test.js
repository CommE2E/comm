// @flow

import invariant from 'invariant';
import t from 'tcomb';

import {
  extractUserIDsFromPayload,
  extractFarcasterIDsFromPayload,
  convertServerIDsToClientIDs,
  convertClientIDsToServerIDs,
  convertBytesToObj,
  convertObjToBytes,
} from './conversion-utils.js';
import { tShape, tID, idSchemaRegex } from './validation-utils.js';
import { farcasterMessageValidator } from '../shared/farcaster/farcaster-messages-types.js';
import { fetchMessageInfosResponseValidator } from '../types/validators/message-validators.js';

type ComplexType = { +ids: { +[string]: $ReadOnlyArray<string> } };

describe('id conversion', () => {
  it('should convert string id', () => {
    const validator = tShape<{ +id: string }>({ id: tID });
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
    const validator = tShape<ComplexType>({ ids: t.dict(tID, t.list(tID)) });
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

describe('Pending ids tests', () => {
  it('should convert pending ids', () => {
    const validator = t.list(tID);
    const serverData = ['pending/sidebar/1', 'pending/type4/1+2+3'];
    const clientData = ['pending/sidebar/0|1', 'pending/type4/1+2+3'];

    expect(
      convertServerIDsToClientIDs('0', validator, serverData),
    ).toStrictEqual(clientData);
    expect(
      convertClientIDsToServerIDs('0', validator, clientData),
    ).toStrictEqual(serverData);
  });
});

describe('extractUserIDsFromPayload', () => {
  it('should extract all user ids from payload', () => {
    const payload = {
      rawMessageInfos: [
        {
          type: 0,
          threadID: '1000',
          creatorID: '0',
          time: 0,
          text: 'test',
          id: '2000',
        },
        {
          type: 0,
          threadID: '1000',
          creatorID: '1',
          time: 0,
          text: 'test',
          id: '2001',
        },
      ],
      truncationStatuses: {},
      userInfos: {
        ['100']: { id: '100', username: 'test1' },
        ['200']: { id: '200', username: 'test2' },
      },
    };
    expect(
      extractUserIDsFromPayload(fetchMessageInfosResponseValidator, payload),
    ).toEqual(['0', '1', '100', '200']);
  });
});

describe('extractFarcasterIDsFromPayload', () => {
  it('should extract all Farcaster IDs from payload', () => {
    const payload = {
      conversationId: '4282-7811',
      hasMention: false,
      isDeleted: false,
      isPinned: false,
      isProgrammatic: false,
      mentions: [],
      message:
        'thanks again for helping test, your report was super helpful to getting the problem solved :)',
      messageId: '08ac07f52d1c2ad9759ffea13edd695b',
      reactions: [],
      senderContext: {
        displayName: 'Ashoat',
        fid: 7811,
        pfp: {
          url: 'https://i.imgur.com/ToR9Mqd.jpg',
          verified: false,
        },
        username: 'ashoat.eth',
      },
      senderFid: 7811,
      serverTimestamp: 1761148247480,
      type: 'text',
      viewerContext: {
        focused: false,
        isLastReadMessage: false,
        reactions: [],
      },
    };
    expect(
      extractFarcasterIDsFromPayload(farcasterMessageValidator, payload),
    ).toEqual([7811]);
  });
});

describe('convertObjToBytes and convertBytesToObj', () => {
  it('should convert object to byte array and back', () => {
    const obj = { hello: 'world', foo: 'bar', a: 2, b: false };

    const bytes = convertObjToBytes(obj);
    const restored = convertBytesToObj<typeof obj>(bytes);

    expect(restored).toStrictEqual(obj);
  });
});
