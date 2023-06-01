// @flow

import css from './landing.css';

export type ImageAsset = {
  +alt: string,
  +url: string,
};

export type Asset = {
  +containerClassName: string,
  +colorHeader: boolean,
  +headerTextContent: string,
  +paragraphTextContent: string,
  +navLinkDestination: string,
  +linkTextContent: string,
};

export const assetsCacheURLPrefix = 'https://dh9fld3hutpxf.cloudfront.net';
export const imageAssetMetaData = [
  {
    alt: 'hero image showcasing Comm',
    url: `${assetsCacheURLPrefix}/hero`,
  },
];

export const assetMetaData = [
  {
    containerClassName: css.keyserverInfo,
    colorHeader: true,
    headerTextContent: 'Own your data and communities with keyservers',
    paragraphTextContent:
      'Porem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molesti, dictum est a, mattis tellus. Sed dignissim, metus nec fringilla accumsan, risus sem sollicitudin lacus, ut interdum tellus elit sed risus. Maecenas eget condimentum velit, sit amet feugiat lectus.',
    navLinkDestination: '/keyservers',
    linkTextContent: 'Learn more about keyservers',
  },
  {
    containerClassName: css.teamInfo,
    colorHeader: false,
    headerTextContent: 'Our story and vision',
    paragraphTextContent:
      'Porem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molesti, dictum est a, mattis tellus. Sed dignissim, metus nec fringilla accumsan, risus sem sollicitudin lacus, ut interdum tellus elit sed risus. Maecenas eget condimentum velit, sit amet feugiat lectus.',
    navLinkDestination: '/team',
    linkTextContent: 'Learn more about our team',
  },
];
