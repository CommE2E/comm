// @flow

import { isValidSIWENonce } from './siwe-utils.js';

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
});
