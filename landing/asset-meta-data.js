// @flow

import css from './landing.css';

export type Asset = {
  +alt: string,
  +url: string,
  +title: string,
  +description: string,
  +imageStyle: string,
  +infoStyle: string,
};

export const assetsCacheURLPrefix = 'https://dh9fld3hutpxf.cloudfront.net';
export const assetMetaData = [
  {
    alt: 'a mobile phone screen highlighting chat and DAO voting',
    url: `${assetsCacheURLPrefix}/Header`,
    imageStyle: css.heroImage,
    infoStyle: css.heroInfo,
    title: 'Header',
    description: '',
  },
];
