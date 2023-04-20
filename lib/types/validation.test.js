// @flow

import {
  imageValidator,
  videoValidator,
  mediaValidator,
} from './media-types.js';

describe('media validation', () => {
  const photo = {
    id: '92696',
    type: 'photo',
    uri: 'http://0.0.0.0:3000/comm/upload/92696/0fb272bd1c75d976',
    dimensions: {
      width: 340,
      height: 288,
    },
  };
  const video = {
    type: 'video',
    id: '92769',
    uri: 'http://0.0.0.0:3000/comm/upload/92769/4bcc6987b25b2f66',
    dimensions: {
      width: 480,
      height: 270,
    },
    thumbnailID: '92770',
    thumbnailURI: 'http://0.0.0.0:3000/comm/upload/92770/d56466051dcef1db',
  };

  it('should validate correct media', () => {
    expect(mediaValidator.is(photo)).toBe(true);
    expect(imageValidator.is(photo)).toBe(true);
    expect(mediaValidator.is(video)).toBe(true);
    expect(videoValidator.is(video)).toBe(true);
  });

  it('should not validate incorrect media', () => {
    expect(imageValidator.is(video)).toBe(false);
    expect(videoValidator.is(photo)).toBe(false);
    expect(mediaValidator.is({ ...photo, type: undefined })).toBe(false);
    expect(mediaValidator.is({ ...video, dimensions: undefined })).toBe(false);
  });
});
