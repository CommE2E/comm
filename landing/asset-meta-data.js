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

export const assetUrl = 'https://dh9fld3hutpxf.cloudfront.net';
export const assetMetaData = [
  {
    alt: 'a mobile phone screen highlighting chat and DAO voting',
    url: `${assetUrl}/Header`,
    imageStyle: css.heroImage,
    infoStyle: css.heroInfo,
    title: 'Header',
    description: '',
  },
  {
    alt: 'a mobile phone screen highlighting chat organization',
    url: `${assetUrl}/Federated`,
    imageStyle: css.federatedImage,
    infoStyle: css.federatedInfo,
    title: 'Federated',
    description: `Comm is a protocol paired with an app.
                   Each community hosts its own backend,
                   which we call a keyserver.
                   Our keyserver software is built to be forked.`,
  },
  {
    alt: 'a web app screen highlighting web3 apps in Comm',
    url: `${assetUrl}/Customizable`,
    imageStyle: css.customizableImage,
    infoStyle: css.customizableInfo,
    title: 'Customizable',
    description: `Write mini-apps and custom modules in React.
                   Skin your community. Customize your tabs and your home page.`,
  },
  {
    alt: 'a mobile phone screen highlighting a conversation',
    url: `${assetUrl}/E2E-encrypted`,
    imageStyle: css.encryptedImage,
    infoStyle: css.encryptedInfo,
    title: 'E2E-encrypted',
    description: `Comm started as a project to build a private, decentralized
                 alternative to Discord. Privacy is in our DNA.`,
  },
  {
    alt: 'a mobile phone user information screen',
    url: `${assetUrl}/Sovereign`,
    imageStyle: css.sovereignImage,
    infoStyle: css.sovereignInfo,
    title: 'Sovereign',
    description: `Log in with your wallet. Use ENS as your username. On Comm,
                 your identity and data are yours to control.`,
  },
  {
    alt: 'a web app screen highlighting web3 apps in Comm',
    url: `${assetUrl}/Open-Source`,
    imageStyle: css.openSourceImage,
    infoStyle: css.openSourceInfo,
    title: 'Open Source',
    description: `All of our code is open source. Keyservers, iOS/Android app, our
                 cloud services… all of it. We believe in open platforms.`,
  },
  {
    alt: 'a mobile phone notification options screen',
    url: `${assetUrl}/Less-Noisy`,
    imageStyle: css.lessNoisyImage,
    infoStyle: css.lessNoisyInfo,
    title: 'Less Noisy',
    description: `We let each user decide what they want to follow with detailed
                 notif controls and a powerful unified inbox.`,
  },
];
