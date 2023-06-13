// @flow

const competitors = Object.freeze({
  DISCORD: 'discord',
  KEYBASE: 'keybase',
  MATRIX: 'matrix',
  SIGNAL: 'signal',
  SLACK: 'slack',
  TELEGRAM: 'telegram',
});
export type Competitors = $Values<typeof competitors>;

export type FeatureComparison = {
  +title: string,
  +comingSoon: boolean,
  +competitorDescriptionShort: string,
  +commDescriptionShort: string,
  +competitorDescriptionLong: string,
  +commDescriptionLong: string,
  +furtherReadingLinks?: $ReadOnlyArray<string>,
};

export type Competitor = {
  +id: Competitors,
  +name: string,
  +featureComparison: $ReadOnlyArray<FeatureComparison>,
};

const competitorData: { [key: string]: Competitor } = Object.freeze({
  discord: {
    id: 'discord',
    name: 'Discord',
    featureComparison: [
      {
        title: 'Backup',
        comingSoon: true,
        competitorDescriptionShort:
          'Discord does not back up your data. Data is stored locally on your device.',
        commDescriptionShort:
          'Comm backs up all of your encrypted user data via our backup service.',
        competitorDescriptionLong:
          'With the exception of some group membership information, Discord does not back up your data. The only way to transfer data from an old phone to a new phone is via P2P transfer, which is not always possible.',
        commDescriptionLong:
          'Comm backs up all of your user data via our backup service. The backup is encrypted so that Comm is not able to access the data.',
        furtherReadingLinks: [
          'https://signal.org/blog/signal-private-group-system/',
        ],
      },
      {
        title: 'Communities',
        comingSoon: false,
        competitorDescriptionShort:
          'Discord does not support communities with channels à la Discord or Slack.',
        commDescriptionShort:
          'Comm supports communities with features including channels, roles, threads, and more.',
        competitorDescriptionLong:
          'While Discord supports group chats, it does not support communities with channels à la Discord or Slack. There are no user-owned backends on Signal, which limits product functionality and scale.',
        commDescriptionLong:
          'Comm leverages keyservers to support sophisticated community functionality, including channels, roles, threads, and much more.',
      },
      {
        title: 'Identity',
        comingSoon: false,
        competitorDescriptionShort:
          'Your identity on Signal is linked to a phone number.',
        commDescriptionShort:
          'Comm accounts are associated with a username or an Ethereum wallet',
        competitorDescriptionLong:
          'Your identity on Signal is linked to a phone number, which limits the anonymity and sovereignty of user accounts.',
        commDescriptionLong:
          'Comm accounts can be linked either to a pseudonymous username or to an Ethereum wallet.',
      },
      {
        title: 'Key resets',
        comingSoon: false,
        competitorDescriptionShort:
          "Discord's servers can reset anybody's public keys in order to facilitate account recovery.",
        commDescriptionShort:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys.',
        competitorDescriptionLong:
          'Signal\'s servers have the ability to reset any phone number\'s public keys at any time. This functionality is used to facilitate account recovery. Signal relies on users manually verifying "Safety Numbers" in order to verify that a public key reset is valid.',
        commDescriptionLong:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys. Note that if the user forgets the secret securing their backup, they will not be able to recover their account.',
        furtherReadingLinks: [
          'https://twitter.com/CommDotApp/status/1545193952554336257',
        ],
      },
      {
        title: 'Notifications',
        comingSoon: false,
        competitorDescriptionShort:
          'Signal has a single function to mute notifs from a chat.',
        commDescriptionShort:
          'Comm allows you to manage notif alerts separately from notif badging.',
        competitorDescriptionLong:
          'Signal has a single function to mute notifs from a chat.',
        commDescriptionLong:
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate "Background" tab in order to avoid cluttering your inbox.',
      },
    ],
  },
  keybase: {
    id: 'keybase',
    name: 'Keybase',
    featureComparison: [
      {
        title: 'Backup',
        comingSoon: true,
        competitorDescriptionShort:
          'Keybase does not back up your data. Data is stored locally on your device.',
        commDescriptionShort:
          'Comm backs up all of your encrypted user data via our backup service.',
        competitorDescriptionLong:
          'With the exception of some group membership information, Keybase does not back up your data. The only way to transfer data from an old phone to a new phone is via P2P transfer, which is not always possible.',
        commDescriptionLong:
          'Comm backs up all of your user data via our backup service. The backup is encrypted so that Comm is not able to access the data.',
        furtherReadingLinks: [
          'https://signal.org/blog/signal-private-group-system/',
        ],
      },
      {
        title: 'Communities',
        comingSoon: false,
        competitorDescriptionShort:
          'Keybase does not support communities with channels à la Discord or Slack.',
        commDescriptionShort:
          'Comm supports communities with features including channels, roles, threads, and more.',
        competitorDescriptionLong:
          'While Keybase supports group chats, it does not support communities with channels à la Discord or Slack. There are no user-owned backends on Signal, which limits product functionality and scale.',
        commDescriptionLong:
          'Comm leverages keyservers to support sophisticated community functionality, including channels, roles, threads, and much more.',
      },
      {
        title: 'Identity',
        comingSoon: false,
        competitorDescriptionShort:
          'Your identity on Signal is linked to a phone number.',
        commDescriptionShort:
          'Comm accounts are associated with a username or an Ethereum wallet',
        competitorDescriptionLong:
          'Your identity on Signal is linked to a phone number, which limits the anonymity and sovereignty of user accounts.',
        commDescriptionLong:
          'Comm accounts can be linked either to a pseudonymous username or to an Ethereum wallet.',
      },
      {
        title: 'Key resets',
        comingSoon: false,
        competitorDescriptionShort:
          "Discord's servers can reset anybody's public keys in order to facilitate account recovery.",
        commDescriptionShort:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys.',
        competitorDescriptionLong:
          'Signal\'s servers have the ability to reset any phone number\'s public keys at any time. This functionality is used to facilitate account recovery. Signal relies on users manually verifying "Safety Numbers" in order to verify that a public key reset is valid.',
        commDescriptionLong:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys. Note that if the user forgets the secret securing their backup, they will not be able to recover their account.',
        furtherReadingLinks: [
          'https://twitter.com/CommDotApp/status/1545193952554336257',
        ],
      },
      {
        title: 'Notifications',
        comingSoon: false,
        competitorDescriptionShort:
          'Signal has a single function to mute notifs from a chat.',
        commDescriptionShort:
          'Comm allows you to manage notif alerts separately from notif badging.',
        competitorDescriptionLong:
          'Signal has a single function to mute notifs from a chat.',
        commDescriptionLong:
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate "Background" tab in order to avoid cluttering your inbox.',
      },
    ],
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix',
    featureComparison: [
      {
        title: 'Backup',
        comingSoon: true,
        competitorDescriptionShort:
          'Matrix does not back up your data. Data is stored locally on your device.',
        commDescriptionShort:
          'Comm backs up all of your encrypted user data via our backup service.',
        competitorDescriptionLong:
          'With the exception of some group membership information, Matrix does not back up your data. The only way to transfer data from an old phone to a new phone is via P2P transfer, which is not always possible.',
        commDescriptionLong:
          'Comm backs up all of your user data via our backup service. The backup is encrypted so that Comm is not able to access the data.',
        furtherReadingLinks: [
          'https://signal.org/blog/signal-private-group-system/',
        ],
      },
      {
        title: 'Communities',
        comingSoon: false,
        competitorDescriptionShort:
          'Matrix does not support communities with channels à la Discord or Slack.',
        commDescriptionShort:
          'Comm supports communities with features including channels, roles, threads, and more.',
        competitorDescriptionLong:
          'While Matrix supports group chats, it does not support communities with channels à la Discord or Slack. There are no user-owned backends on Signal, which limits product functionality and scale.',
        commDescriptionLong:
          'Comm leverages keyservers to support sophisticated community functionality, including channels, roles, threads, and much more.',
      },
      {
        title: 'Identity',
        comingSoon: false,
        competitorDescriptionShort:
          'Your identity on Signal is linked to a phone number.',
        commDescriptionShort:
          'Comm accounts are associated with a username or an Ethereum wallet',
        competitorDescriptionLong:
          'Your identity on Signal is linked to a phone number, which limits the anonymity and sovereignty of user accounts.',
        commDescriptionLong:
          'Comm accounts can be linked either to a pseudonymous username or to an Ethereum wallet.',
      },
      {
        title: 'Key resets',
        comingSoon: false,
        competitorDescriptionShort:
          "Discord's servers can reset anybody's public keys in order to facilitate account recovery.",
        commDescriptionShort:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys.',
        competitorDescriptionLong:
          'Signal\'s servers have the ability to reset any phone number\'s public keys at any time. This functionality is used to facilitate account recovery. Signal relies on users manually verifying "Safety Numbers" in order to verify that a public key reset is valid.',
        commDescriptionLong:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys. Note that if the user forgets the secret securing their backup, they will not be able to recover their account.',
        furtherReadingLinks: [
          'https://twitter.com/CommDotApp/status/1545193952554336257',
        ],
      },
      {
        title: 'Notifications',
        comingSoon: false,
        competitorDescriptionShort:
          'Signal has a single function to mute notifs from a chat.',
        commDescriptionShort:
          'Comm allows you to manage notif alerts separately from notif badging.',
        competitorDescriptionLong:
          'Signal has a single function to mute notifs from a chat.',
        commDescriptionLong:
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate "Background" tab in order to avoid cluttering your inbox.',
      },
    ],
  },
  signal: {
    id: 'signal',
    name: 'Signal',
    featureComparison: [
      {
        title: 'Backup',
        comingSoon: true,
        competitorDescriptionShort:
          'Signal does not back up your data. Data is stored locally on your device.',
        commDescriptionShort:
          'Comm backs up all of your encrypted user data via our backup service.',
        competitorDescriptionLong:
          'With the exception of some group membership information, Signal does not back up your data. The only way to transfer data from an old phone to a new phone is via P2P transfer, which is not always possible.',
        commDescriptionLong:
          'Comm backs up all of your user data via our backup service. The backup is encrypted so that Comm is not able to access the data.',
        furtherReadingLinks: [
          'https://signal.org/blog/signal-private-group-system/',
        ],
      },
      {
        title: 'Communities',
        comingSoon: false,
        competitorDescriptionShort:
          'Signal does not support communities with channels à la Discord or Slack.',
        commDescriptionShort:
          'Comm supports communities with features including channels, roles, threads, and more.',
        competitorDescriptionLong:
          'While Signal supports group chats, it does not support communities with channels à la Discord or Slack. There are no user-owned backends on Signal, which limits product functionality and scale.',
        commDescriptionLong:
          'Comm leverages keyservers to support sophisticated community functionality, including channels, roles, threads, and much more.',
      },
      {
        title: 'Identity',
        comingSoon: false,
        competitorDescriptionShort:
          'Your identity on Signal is linked to a phone number.',
        commDescriptionShort:
          'Comm accounts are associated with a username or an Ethereum wallet',
        competitorDescriptionLong:
          'Your identity on Signal is linked to a phone number, which limits the anonymity and sovereignty of user accounts.',
        commDescriptionLong:
          'Comm accounts can be linked either to a pseudonymous username or to an Ethereum wallet.',
      },
      {
        title: 'Key resets',
        comingSoon: false,
        competitorDescriptionShort:
          "Signal's servers can reset anybody's public keys in order to facilitate account recovery.",
        commDescriptionShort:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys.',
        competitorDescriptionLong:
          'Signal\'s servers have the ability to reset any phone number\'s public keys at any time. This functionality is used to facilitate account recovery. Signal relies on users manually verifying "Safety Numbers" in order to verify that a public key reset is valid.',
        commDescriptionLong:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys. Note that if the user forgets the secret securing their backup, they will not be able to recover their account.',
        furtherReadingLinks: [
          'https://twitter.com/CommDotApp/status/1545193952554336257',
        ],
      },
      {
        title: 'Notifications',
        comingSoon: false,
        competitorDescriptionShort:
          'Signal has a single function to mute notifs from a chat.',
        commDescriptionShort:
          'Comm allows you to manage notif alerts separately from notif badging.',
        competitorDescriptionLong:
          'Signal has a single function to mute notifs from a chat.',
        commDescriptionLong:
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate "Background" tab in order to avoid cluttering your inbox.',
      },
    ],
  },
});

export { competitorData };
