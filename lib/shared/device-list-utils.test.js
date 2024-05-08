// @flow

import { verifyDeviceListUpdates } from './device-list-utils.js';
import type {
  RawDeviceList,
  SignedDeviceList,
  IdentityServiceClient,
} from '../types/identity-service-types.js';
import * as config from '../utils/config.js';

// mockOlmAPIVerification replaces OlmAPI with a mock
// save original to avoid affecting other test suites
let originalConfig;
beforeAll(() => {
  if (config.hasConfig()) {
    originalConfig = config.getConfig();
  }
});
afterAll(() => {
  if (originalConfig) {
    config.registerConfig(originalConfig);
  }
});

describe(verifyDeviceListUpdates, () => {
  it('succeeds for unsigned device list updates', async () => {
    mockOlmAPIVerification(jest.fn());
    const updates: $ReadOnlyArray<SignedDeviceList> = [
      createDeviceList({ devices: ['D1'], timestamp: 1 }),
      createDeviceList({ devices: ['D1', 'D2'], timestamp: 2 }),
      createDeviceList({ devices: ['D1'], timestamp: 3 }),
    ];
    const identityClient = mockIdentityClientWithDeviceListHistory(updates);

    const result = await verifyDeviceListUpdates(identityClient, 'foo');
    expect(result.valid).toEqual(true);
  });
  it('fails for empty device list history', async () => {
    const updates: $ReadOnlyArray<SignedDeviceList> = [];
    const identityClient = mockIdentityClientWithDeviceListHistory(updates);

    const result = await verifyDeviceListUpdates(identityClient, 'foo');
    expect(result.valid).toEqual(false);
    expect(result.reason).toEqual('empty_device_list_history');
  });
  it('fails for incorrect timestamp order', async () => {
    mockOlmAPIVerification(jest.fn());
    const updates: $ReadOnlyArray<SignedDeviceList> = [
      createDeviceList({ devices: ['D1'], timestamp: 2 }),
      createDeviceList({ devices: ['D2'], timestamp: 1 }),
    ];
    const identityClient = mockIdentityClientWithDeviceListHistory(updates);

    const result = await verifyDeviceListUpdates(identityClient, 'foo');
    expect(result.valid).toEqual(false);
    expect(result.reason).toEqual('invalid_timestamp_order');
    expect(result.timestamp).toEqual(1);
  });
  it('fails for empty device list updates', async () => {
    mockOlmAPIVerification(jest.fn());
    const updates: $ReadOnlyArray<SignedDeviceList> = [
      createDeviceList({ devices: ['D1'], timestamp: 1 }),
      createDeviceList({ devices: ['D2'], timestamp: 2 }),
      createDeviceList({ devices: [], timestamp: 3 }),
    ];
    const identityClient = mockIdentityClientWithDeviceListHistory(updates);

    const result = await verifyDeviceListUpdates(identityClient, 'foo');
    expect(result.valid).toEqual(false);
    expect(result.reason).toEqual('empty_device_list_update');
    expect(result.timestamp).toEqual(3);
  });

  it('verifies primary signature', async () => {
    const verifySignature = jest
      .fn<any, any>()
      .mockImplementation((_, signature, primaryDeviceID) =>
        Promise.resolve(signature === `${primaryDeviceID}_signature`),
      );
    mockOlmAPIVerification(verifySignature);

    const updates: $ReadOnlyArray<SignedDeviceList> = [
      createDeviceList({ devices: ['D1'], timestamp: 1 }),
      createDeviceList({ devices: ['D1', 'D2'], timestamp: 2 }, 'D1_signature'),
    ];
    const identityClient = mockIdentityClientWithDeviceListHistory(updates);

    const result = await verifyDeviceListUpdates(identityClient, 'foo');
    expect(result.valid).toEqual(true);
    expect(verifySignature).toHaveBeenCalledTimes(1);
  });
  it('fails for invalid primary signature', async () => {
    const verifySignature = jest
      .fn<any, any>()
      .mockImplementation(() => Promise.resolve(false));
    mockOlmAPIVerification(verifySignature);

    const updates: $ReadOnlyArray<SignedDeviceList> = [
      createDeviceList({ devices: ['D1'], timestamp: 1 }),
      createDeviceList({ devices: ['D1', 'D2'], timestamp: 2 }, 'invalid'),
    ];
    const identityClient = mockIdentityClientWithDeviceListHistory(updates);

    const result = await verifyDeviceListUpdates(identityClient, 'foo');

    expect(verifySignature).toBeCalledWith(expect.anything(), 'invalid', 'D1');
    expect(result.valid).toEqual(false);
    expect(result.reason).toEqual('invalid_cur_primary_signature');
    expect(result.timestamp).toEqual(2);
  });
  it('verifies both signatures if primary device changes', async () => {
    const verifySignature = jest
      .fn<any, any>()
      .mockImplementation((_, signature, primaryDeviceID) =>
        Promise.resolve(signature === `${primaryDeviceID}_signature`),
      );
    mockOlmAPIVerification(verifySignature);

    const updates: $ReadOnlyArray<SignedDeviceList> = [
      createDeviceList({ devices: ['D1'], timestamp: 1 }),
      createDeviceList(
        { devices: ['D2', 'D3'], timestamp: 2 },
        'D2_signature',
        'D1_signature',
      ),
    ];
    const identityClient = mockIdentityClientWithDeviceListHistory(updates);

    const result = await verifyDeviceListUpdates(identityClient, 'foo');

    expect(result.valid).toEqual(true);
    expect(verifySignature).toHaveBeenCalledTimes(2);
    expect(verifySignature).toHaveBeenNthCalledWith(
      1, // first it verifies curSignature
      expect.anything(),
      'D2_signature',
      'D2',
    );
    expect(verifySignature).toHaveBeenNthCalledWith(
      2, // then it verifies lastSignature
      expect.anything(),
      'D1_signature',
      'D1',
    );
  });
});

function createDeviceList(
  rawList: RawDeviceList,
  curPrimarySignature?: string,
  lastPrimarySignature?: string,
): SignedDeviceList {
  return {
    rawDeviceList: JSON.stringify(rawList),
    curPrimarySignature,
    lastPrimarySignature,
  };
}

function mockIdentityClientWithDeviceListHistory(
  history: $ReadOnlyArray<SignedDeviceList>,
): IdentityServiceClient {
  const client: Partial<IdentityServiceClient> = {
    getDeviceListHistoryForUser: jest
      .fn<any, typeof history>()
      .mockResolvedValueOnce(history),
  };
  return client;
}

function mockOlmAPIVerification(func: typeof jest.fn) {
  const olmAPI: any = {
    verifyMessage: func,
  };
  const cfg: any = { olmAPI };
  config.registerConfig(cfg);
}
