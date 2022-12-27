// @flow

import { isValidEthereumAddress, isValidSIWENonce } from './siwe-utils.js';

describe('SIWE Nonce utils', () => {
  it('isValidSIWENonce should match valid nonces', () => {
    // Following valid nonces generated using `siwe/generateNonce()` function
    const validNonces = [
      '1VxXbANmmHLFP4eks',
      '2MmJuAAseMtLv5mCn',
      '2USPurs7uBwua8S8x',
      '3Qk22CmMo65LpaG9c',
      '4QXu7RFVlXreNzQrK',
      '5BLyDYtuk7coJCvzC',
      '7K2JD4wCmGrKsTkOF',
      'Akx19qnKDuvB48SZC',
      'aTirbrzPTKVPOCl4D',
      'bkjdjOg4tA7Xpy452',
      'BNhdFo59dEribfobg',
      'buf0Wxv4bGLjcWT3c',
      'CoXCHoJTCdVy5sTtf',
      'd7oetTb1wJuvhCA4l',
      'DMaRtZ6yiLRnuyafK',
      'e7Sdl1z6EQiXCN8l9',
      'EF4Hdiej0gxDmBjvy',
      'EFauh8CSAIRlDwOLg',
      'eqbMxIOjiJdjskqlN',
      'fOYFxCD5ir430agxl',
      'GCN1lI61eRvHUws1M',
      'gGDMKiPcbykhCwzMO',
      'gJCSvNZ1pHksy5TpJ',
      'gzgnURrK65KTlfYBp',
      'H4wZ6w5qiisbulWzI',
      'hNJFuzAdnSEU4bx8X',
      'HWaO4nN9aDGH8AnaA',
      'IU5DJWa9TUXz5H1tV',
      'kDE8OPvsheXIihCj4',
      'LaQ8i3ZJY3DpdwCPI',
      'LBWHU6XM4MFjLqXrd',
      'lf3hoCBuqTdsl58EA',
      'm1nx1X4EQJRL3Sg9b',
      'Mk6t3PKZnL8jwcd0n',
      'mnkumoUJFtI9Zhxdu',
      'OPL9f2NvQL3d8rHce',
      'orJqvnFu0dsIDuPPv',
      'ox9zchmtBRDUxhiKr',
      'q35RUCfsoGHszDi2W',
      'qc13k7CZp9noVr9Xm',
      'QnyXVsOu4ul4E8UTT',
      'RBDJVgUWxrxVoOYpg',
      'u3vxhrCwHihNlwZOf',
      'wBF0fzrjy4oWrager',
      'xEmvoMx72izf48yKN',
      'Xha2QfepadZtolkTi',
      'XZLvZW0VqcK3og31l',
      'yGMxs0bt7r15KxAFF',
      'YmHPiTCKGzTMyWe3x',
      'YzxFDqTd84pTDbcJP',
    ];

    validNonces.forEach(nonce => {
      expect(isValidSIWENonce(nonce)).toBe(true);
    });
  });

  it('isValidSIWENonce should fail if nonce is wrong length', () => {
    const shortNonce = '1VxXbANmmHLFP4ek';
    expect(isValidSIWENonce(shortNonce)).toBe(false);

    const longNonce = '1VxXbANmmHLFP4eks1';
    expect(isValidSIWENonce(longNonce)).toBe(false);
  });

  it('isValidSIWENonce should fail if nonce has invalid characters', () => {
    const invalidNonce = '1VxXbANmmHLFP4ek!';
    expect(isValidSIWENonce(invalidNonce)).toBe(false);
  });

  it('isValidEthereumAddress should match valid ethereum addresses', () => {
    // Following valid ethereum addresses from https://etherscan.io/accounts
    const validEthereumAddresses = [
      '0x00000000219ab540356cbb839cbe05303d7705fa',
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8',
      '0xda9dfa130df4de4673b89022ee50ff26f6ea73cf',
      '0x0716a17fbaee714f1e6ab0f9d59edbc5f09815c0',
      '0xf977814e90da44bfa03b6295a0616a897441acec',
      '0x8315177ab297ba92a06054ce80a67ed4dbd7ed3a',
      '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503',
      '0x61edcdf5bb737adffe5043706e7c5bb1f1a56eea',
      '0xe92d1a43df510f82c66382592a047d288f85226f',
      '0x742d35cc6634c0532925a3b844bc454e4438f44e',
      '0xdf9eb223bafbe5c5271415c75aecd68c21fe3d7f',
      '0x1b3cb81e51011b549d78bf720b0d924ac763a7c2',
      '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae',
      '0xca8fa8f0b631ecdb18cda619c4fc9d197c8affca',
      '0x756d64dc5edb56740fc617628dc832ddbcfd373c',
      '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5',
      '0x3bfc20f0b9afcace800d73d2191166ff16540258',
      '0xcffad3200574698b78f32232aa9d63eabd290703',
      '0x8484ef722627bf18ca5ae6bcf031c23e6e922b30',
      '0x8103683202aa8da10536036edef04cdd865c225e',
      '0x78605df79524164911c144801f41e9811b7db73d',
      '0x189b9cbd4aff470af2c0102f365fc1823d857965',
      '0xdc24316b9ae028f1497c275eb9192a3ea0f67022',
      '0x0a4c79ce84202b03e95b7a692e5d728d83c44c76',
      '0x220866b1a2219f40e72f5c628b65d54268ca3a9d',
      '0x2b6ed29a95753c3ad948348e3e7b1a251080ffb9',
      '0x195b91ccebd51aa61d851fe531f5612dea4efbfd',
      '0x28c6c06298d514db089934071355e5743bf21d60',
      '0x9845e1909dca337944a0272f1f9f7249833d2d19',
      '0x99c9fc46f92e8a1c0dec1b1747d010903e884be1',
      '0x176f3dab24a159341c0509bb36b833e7fdd0a132',
      '0x07ee55aa48bb72dcc6e9d78256648910de513eca',
      '0xa3ae36c55a076e849b9d3de677d1e0b6e9c98e84',
      '0x59448fe20378357f206880c58068f095ae63d5a5',
      '0x73af3bcf944a6559933396c1577b257e2054d935',
      '0x558553d54183a8542f7832742e7b4ba9c33aa1e6',
      '0x98ec059dc3adfbdd63429454aeb0c990fba4a128',
      '0x539c92186f7c6cc4cbf443f26ef84c595babbca1',
      '0xbfbbfaccd1126a11b8f84c60b09859f80f3bd10f',
      '0x868dab0b8e21ec0a48b726a1ccf25826c78c6d7f',
      '0x0c23fc0ef06716d2f8ba19bc4bed56d045581f2d',
      '0x6262998ced04146fa42253a5c0af90ca02dfd2a3',
      '0xcdbf58a9a9b54a2c43800c50c7192946de858321',
      '0xbddf00563c9abd25b576017f08c46982012f12be',
      '0xe523fc253bcdea8373e030ee66e00c6864776d70',
      '0x2f2d854c1d6d5bb8936bb85bc07c28ebb42c9b10',
      '0xbf3aeb96e164ae67e763d9e050ff124e7c3fdd28',
      '0x434587332cc35d33db75b93f4f27cc496c67a4db',
      '0x36a85757645e8e8aec062a1dee289c7d615901ca',
    ];

    validEthereumAddresses.forEach(address => {
      expect(isValidEthereumAddress(address)).toBe(true);
    });
  });

  it('isValidEthereumAddress should fail if address is wrong length', () => {
    const shortEthereumAddress = '0x36a85757645e8e8aec062a1dee289c7d615901';
    expect(isValidEthereumAddress(shortEthereumAddress)).toBe(false);

    const longEthereumString = '0x36a85757645e8e8aec062a1dee289c7d615901cAAAAA';
    expect(isValidEthereumAddress(longEthereumString)).toBe(false);
  });

  it('isValidEthereumAddress should fail if address has invalid characters', () => {
    const invalidAddress = '0x36a85757645e8e8aec062a1dee289c7d615901ca!';
    expect(isValidEthereumAddress(invalidAddress)).toBe(false);
  });

  it(`isValidEthereumAddress should fail if address doesn't begin with 0x`, () => {
    const invalidAddress = 'e523fc253bcdea8373e030ee66e00c6864776d70';
    expect(isValidEthereumAddress(invalidAddress)).toBe(false);
  });
});
