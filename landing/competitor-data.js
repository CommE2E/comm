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
        title: 'Active development',
        comingSoon: false,
        competitorDescriptionShort:
          'Following its acquisition by Zoom, Keybase is no longer in active development.',
        commDescriptionShort: 'Comm is actively in development.',
        competitorDescriptionLong:
          'Following its acquisition by Zoom, Keybase is no longer in active development.',
        commDescriptionLong: 'Comm is actively in development.',
      },
      {
        title: 'Encryption',
        comingSoon: true,
        competitorDescriptionShort:
          'Keybase has a custom implementation of E2E encryption that doesn’t guarantee forward secrecy.',
        commDescriptionShort:
          'Comm uses Signal’s Double Ratchet algorithm, the industry standard for E2E encryption.',
        competitorDescriptionLong:
          'Keybase’s implementation of E2E encryption is unique in the industry. Whereas most apps use something like Signal’s Double Ratchet to preserve forward secrecy, Keybase took a different approach because they wanted to allow new chat members to see the full history of the chat prior to when they joined.',
        commDescriptionLong:
          'Comm uses Matrix.org’s implementation of Double Ratchet, and as such is able to preserve forward secrecy. We allow new chat members to see full chat history by query peers’ keyservers.',
      },
      {
        title: 'Search',
        comingSoon: false,
        competitorDescriptionShort:
          'Keybase searches chats locally by downloading the full history to your client device.',
        commDescriptionShort:
          'Comm utilizes user-hosted keyservers to handle search on the server side.',
        competitorDescriptionLong:
          'Keybase, like all other E2E-encrypted apps, is only able to execute search queries on your local device. As such, in order to fully execute a search query for a chat, Keybase must download that chat’s full history to the client device.',
        commDescriptionLong:
          'Though much research has been done on searchable encryption over the past 20 years, it remains an unsolved problem. Comm is able to circumvent the problem by sending queries to user-hosted keyservers, which are able to access plaintext data.',
      },
      {
        title: 'Key resets',
        comingSoon: false,
        competitorDescriptionShort:
          'Keybase’s servers can reset anybody’s public keys in order to facilitate account recovery.',
        commDescriptionShort:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys.',
        competitorDescriptionLong:
          'Keybase’s servers have the ability to reset any account’s public keys at any time. This functionality is used to facilitate account recovery',
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
          'Keybase has a single function to mute notifs from a chat.',
        commDescriptionShort:
          'Comm allows you to manage notif alerts separately from notif badging.',
        competitorDescriptionLong:
          'Keybase has a single function to mute notifs from a chat.',
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
          'Signal’s servers can reset anybody’s public keys in order to facilitate account recovery.',
        commDescriptionShort:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys.',
        competitorDescriptionLong:
          'Signal’s servers have the ability to reset any phone number’s public keys at any time. This functionality is used to facilitate account recovery. Signal relies on users manually verifying "Safety Numbers" in order to verify that a public key reset is valid.',
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
