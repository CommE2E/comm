// @flow

export type ImageAsset = {
  +alt: string,
  +url: string,
};

export const assetsCacheURLPrefix = 'https://dh9fld3hutpxf.cloudfront.net';
export const imageAssetMetaData = [
  {
    alt: 'hero image showcasing Comm',
    url: `${assetsCacheURLPrefix}/hero`,
  },
];
