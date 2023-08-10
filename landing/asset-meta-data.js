// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './landing.css';
import typography from './typography.css';

const paragraphClassName = classNames([typography.subheading2, css.paragraph]);

export type ImageAsset = {
  +alt: string,
  +url: string,
};

export type Asset = {
  +containerClassName: string,
  +colorHeader: boolean,
  +headerTextContent: string,
  +infoBlockContent: React.Node,
  +navLinkDestination: string,
  +linkTextContent: string,
};

export const assetsCacheURLPrefix = 'https://dh9fld3hutpxf.cloudfront.net';
export const imageAssetMetaData: $ReadOnlyArray<ImageAsset> = [
  {
    alt: 'hero image showcasing Comm',
    url: `${assetsCacheURLPrefix}/hero`,
  },
];

export const assetMetaData: $ReadOnlyArray<Asset> = [
  {
    containerClassName: css.keyserverInfo,
    colorHeader: true,
    headerTextContent: 'Own your data with keyservers',
    infoBlockContent: (
      <>
        <p className={paragraphClassName}>
          Comm&rsquo;s core innovation is the idea of the keyserver: a personal,
          private server.
        </p>
        <p className={paragraphClassName}>
          E2E-encrypted apps today are limited because they have to do
          everything locally, on the user&rsquo;s device. In contrast,
          unencrypted apps are able to rely on servers in the cloud to handle
          queries and background processing, in turn allowing these apps to
          support more sophisticated functionality.
        </p>
        <p className={paragraphClassName}>
          But what if people had their own servers? Keyservers enable Comm to
          offer the best of both worlds: Signal-level privacy with a
          Telegram-level feature set.
        </p>
      </>
    ),
    navLinkDestination: '/keyservers',
    linkTextContent: 'Learn more about keyservers',
  },
  {
    containerClassName: css.teamInfo,
    colorHeader: false,
    headerTextContent: 'Our story and vision',
    infoBlockContent: (
      <>
        <p className={paragraphClassName}>
          <span>Comm was founded by&nbsp;</span>
          <a
            href="https://ashoat.com/"
            target="_blank"
            rel="noreferrer"
            className={css.link}
          >
            Ashoat
          </a>
          <span>
            &nbsp;after his experiences trying to add E2E encryption to a social
            calendaring app exposed the limits of contemporary cryptographic
            approaches. He realized why E2E apps were so limited in
            functionality: the lack of a server layer meant that everything had
            to be done on a phone.
          </span>
        </p>
        <p className={paragraphClassName}>
          Comm&rsquo;s vision is a world where people own their own data. We
          believe that in the future, everybody will have a server.
        </p>
      </>
    ),
    navLinkDestination: '/team',
    linkTextContent: 'Learn more about our team',
  },
];
