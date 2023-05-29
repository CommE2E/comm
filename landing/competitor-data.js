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
  +competitorDescriptionLong: $ReadOnlyArray<string>,
  +commDescriptionLong: $ReadOnlyArray<string>,
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
        competitorDescriptionLong: [
          'With the exception of some group membership information, Discord does not back up your data. The only way to transfer data from an old phone to a new phone is via P2P transfer, which is not always possible.',
        ],
        commDescriptionLong: [
          'Comm backs up all of your user data via our backup service. The backup is encrypted so that Comm is not able to access the data.',
        ],
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
        competitorDescriptionLong: [
          'While Discord supports group chats, it does not support communities with channels à la Discord or Slack. There are no user-owned backends on Signal, which limits product functionality and scale.',
        ],
        commDescriptionLong: [
          'Comm leverages keyservers to support sophisticated community functionality, including channels, roles, threads, and much more.',
        ],
      },
      {
        title: 'Identity',
        comingSoon: false,
        competitorDescriptionShort:
          'Your identity on Signal is linked to a phone number.',
        commDescriptionShort:
          'Comm accounts are associated with a username or an Ethereum wallet',
        competitorDescriptionLong: [
          'Your identity on Signal is linked to a phone number, which limits the anonymity and sovereignty of user accounts.',
        ],
        commDescriptionLong: [
          'Comm accounts can be linked either to a pseudonymous username or to an Ethereum wallet.',
        ],
      },
      {
        title: 'Key resets',
        comingSoon: false,
        competitorDescriptionShort:
          "Discord's servers can reset anybody's public keys in order to facilitate account recovery.",
        commDescriptionShort:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys.',
        competitorDescriptionLong: [
          'Signal\'s servers have the ability to reset any phone number\'s public keys at any time. This functionality is used to facilitate account recovery. Signal relies on users manually verifying "Safety Numbers" in order to verify that a public key reset is valid.',
        ],
        commDescriptionLong: [
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys. Note that if the user forgets the secret securing their backup, they will not be able to recover their account.',
        ],
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
        competitorDescriptionLong: [
          'Signal has a single function to mute notifs from a chat.',
        ],
        commDescriptionLong: [
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate "Background" tab in order to avoid cluttering your inbox.',
        ],
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
        competitorDescriptionLong: [
          'Following its acquisition by Zoom, Keybase is no longer in active development.',
        ],
        commDescriptionLong: ['Comm is actively in development.'],
      },
      {
        title: 'Encryption',
        comingSoon: true,
        competitorDescriptionShort:
          'Keybase has a custom implementation of E2E encryption that doesn’t guarantee forward secrecy.',
        commDescriptionShort:
          'Comm uses the Double Ratchet algorithm. Pioneered by Signal, Double Ratchet is the industry standard for E2E encryption.',
        competitorDescriptionLong: [
          'Keybase’s implementation of E2E encryption is unique in the industry. Whereas most most E2E-encrypted messaging apps use something like Signal’s Double Ratchet to preserve forward secrecy, Keybase took a different approach because they wanted to allow new chat members to see the full history of the chat prior to when they joined.',
        ],
        commDescriptionLong: [
          'Comm uses Matrix.org’s implementation of Double Ratchet, and as such is able to preserve forward secrecy. We allow new chat members to see full chat history by query peers’ keyservers.',
        ],
      },
      {
        title: 'Search',
        comingSoon: false,
        competitorDescriptionShort:
          'Keybase searches chats locally by downloading the full history to your client device.',
        commDescriptionShort:
          'Comm utilizes user-hosted keyservers to handle search on the server side.',
        competitorDescriptionLong: [
          'Keybase, like all other E2E-encrypted apps, is only able to execute search queries on your local device. As such, in order to fully execute a search query for a chat, Keybase must download that chat’s full history to the client device.',
        ],
        commDescriptionLong: [
          'Though much research has been done on searchable encryption over the past 20 years, it remains an unsolved problem. Comm is able to circumvent the problem by sending queries to user-hosted keyservers, which are able to access plaintext data.',
        ],
      },
      {
        title: 'Key resets',
        comingSoon: false,
        competitorDescriptionShort:
          'Keybase’s servers can reset anybody’s public keys in order to facilitate account recovery.',
        commDescriptionShort:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys.',
        competitorDescriptionLong: [
          'Keybase’s servers have the ability to reset any account’s public keys at any time. This functionality is used to facilitate account recovery',
        ],
        commDescriptionLong: [
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys. Note that if the user forgets the secret securing their backup, they will not be able to recover their account.',
        ],
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
        competitorDescriptionLong: [
          'Keybase has a single function to mute notifs from a chat.',
        ],
        commDescriptionLong: [
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate "Background" tab in order to avoid cluttering your inbox.',
        ],
      },
    ],
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix',
    featureComparison: [
      {
        title: 'Encryption',
        comingSoon: true,
        competitorDescriptionShort:
          'E2E encryption is optional in Matrix. Two-person encrypted chats use Double Ratchet, but group chats use a less secure algorithm called Megolm.',
        commDescriptionShort:
          'Comm uses Matrix’s implementation of Signal’s Double Ratchet algorithm for both two-person and group chats.',
        competitorDescriptionLong: [
          'E2E encryption is optional in Matrix. Two-person encrypted chats use Double Ratchet, but group chats use a less secure algorithm called Megolm.',
          'Megolm is a "group ratchet" which trades off security / privacy guarantees to enable scale and performance. Many E2E-encrypted apps (such as WhatsApp) use "group ratchets" for group chats.',
        ],
        commDescriptionLong: [
          'Comm uses Matrix’s implementation of Signal’s Double Ratchet algorithm for both two-person and group chats. However, we don’t use Megolm due to concerns over privacy implications.',
          'Instead of using a group ratchet, Comm arranges group chats in a "pairwise" way. When a user sends a message to a group chat, Comm handles that by sending that message individually to all users in the group chat.',
          'The downside is that group chats don’t scale as well. Comm’s solution for large group chats is keyserver-hosted communities, which avoid sacrificing security / privacy guarantees by using a federated version of a classic client / server paradigm.',
        ],
        furtherReadingLinks: ['https://nebuchadnezzar-megolm.github.io/'],
      },
      {
        title: 'Search',
        comingSoon: false,
        competitorDescriptionShort:
          'Matrix searches encrypted chats locally by downloading the full history to your client device.',
        commDescriptionShort:
          'Comm utilizes user-hosted keyservers to handle search on the server side.',
        competitorDescriptionLong: [
          'While Matrix itself doesn’t handle searches of encrypted chats, the most popular Matrix client Element has support for this.',
          'Element searches encrypted chats locally by downloading the full history to your client device. This isn’t supported in the web app, however.',
        ],
        commDescriptionLong: [
          'For keyserver-hosted chats, Comm utilizes the keyserver to handle search on the server side.',
          'For users without keyservers, DMs are stored locally. In this case Comm handles search locally, and mirrors the full history of DMs across all of a user’s devices. Unlike Element, Comm’s search works on our web app.',
        ],
      },
      {
        title: 'Key resets',
        comingSoon: false,
        competitorDescriptionShort:
          'Matrix homeservers can change a user account’s associated public keys in order to facilitate account recovery.',
        commDescriptionShort:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys.',
        competitorDescriptionLong: [
          'Matrix homeservers are responsible for owning a user’s identity. As such, those homeservers have the ability to reset an account, as well as the public keys used for E2E encryption. This functionality is used to facilitate account recovery.',
        ],
        commDescriptionLong: [
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys. Note that if the user forgets the secret securing their backup, they will not be able to recover their account.',
        ],
        furtherReadingLinks: [
          'https://twitter.com/CommDotApp/status/1539397765536444416',
          'https://twitter.com/CommDotApp/status/1545193952554336257',
        ],
      },
      {
        title: 'Backup',
        comingSoon: true,
        competitorDescriptionShort:
          'Matrix relies on individual implementations and homeservers to handle backup.',
        commDescriptionShort:
          'Comm backs up all of your user data, encrypted with either a password or an ETH wallet.',
        competitorDescriptionLong: [
          'Matrix relies on homeservers to handle backup of unencrypted chats. Backup of encrypted chats is handled differently depending on which implementations of Matrix you’re using.',
          'The most popular implementation of Matrix is Element. Element backs up a group chat’s messages just once for the group, encrypted with the chat keys. Meanwhile, a given user’s chat keys are backed up separately, and encrypted with the user’s Security Phrase/Key.',
        ],
        commDescriptionLong: [
          'Comm backs up all of your user data via our backup service. The backup is encrypted so that Comm is not able to access the data.',
          'Since Comm doesn’t use a group ratchet due to privacy concerns (see "Encryption" section), group chat backups are not shared between users.',
        ],
        furtherReadingLinks: [
          'https://twitter.com/CommDotApp/status/1539397765536444416',
        ],
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
        competitorDescriptionLong: [
          'With the exception of some group membership information, Signal does not back up your data. The only way to transfer data from an old phone to a new phone is via P2P transfer, which is not always possible.',
        ],
        commDescriptionLong: [
          'Comm backs up all of your user data via our backup service. The backup is encrypted so that Comm is not able to access the data.',
        ],
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
        competitorDescriptionLong: [
          'While Signal supports group chats, it does not support communities with channels à la Discord or Slack. There are no user-owned backends on Signal, which limits product functionality and scale.',
        ],
        commDescriptionLong: [
          'Comm leverages keyservers to support sophisticated community functionality, including channels, roles, threads, and much more.',
        ],
      },
      {
        title: 'Identity',
        comingSoon: false,
        competitorDescriptionShort:
          'Your identity on Signal is linked to a phone number.',
        commDescriptionShort:
          'Comm accounts are associated with a username or an Ethereum wallet',
        competitorDescriptionLong: [
          'Your identity on Signal is linked to a phone number, which limits the anonymity and sovereignty of user accounts.',
        ],
        commDescriptionLong: [
          'Comm accounts can be linked either to a pseudonymous username or to an Ethereum wallet.',
        ],
      },
      {
        title: 'Key resets',
        comingSoon: false,
        competitorDescriptionShort:
          'Signal’s servers can reset anybody’s public keys in order to facilitate account recovery.',
        commDescriptionShort:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys.',
        competitorDescriptionLong: [
          'Signal’s servers have the ability to reset any phone number’s public keys at any time. This functionality is used to facilitate account recovery. Signal relies on users manually verifying "Safety Numbers" in order to verify that a public key reset is valid.',
        ],
        commDescriptionLong: [
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys. Note that if the user forgets the secret securing their backup, they will not be able to recover their account.',
        ],
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
        competitorDescriptionLong: [
          'Signal has a single function to mute notifs from a chat.',
        ],
        commDescriptionLong: [
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate "Background" tab in order to avoid cluttering your inbox.',
        ],
      },
    ],
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    featureComparison: [
      {
        title: 'Backup',
        comingSoon: true,
        competitorDescriptionShort:
          'Slack does not back up your data. Data is stored locally on your device.',
        commDescriptionShort:
          'Comm backs up all of your encrypted user data via our backup service.',
        competitorDescriptionLong: [
          'With the exception of some group membership information, Slack does not back up your data. The only way to transfer data from an old phone to a new phone is via P2P transfer, which is not always possible.',
        ],
        commDescriptionLong: [
          'Comm backs up all of your user data via our backup service. The backup is encrypted so that Comm is not able to access the data.',
        ],
        furtherReadingLinks: [
          'https://signal.org/blog/signal-private-group-system/',
        ],
      },
      {
        title: 'Communities',
        comingSoon: false,
        competitorDescriptionShort:
          'Slack does not support communities with channels à la Discord or Slack.',
        commDescriptionShort:
          'Comm supports communities with features including channels, roles, threads, and more.',
        competitorDescriptionLong: [
          'While Slack supports group chats, it does not support communities with channels à la Discord or Slack. There are no user-owned backends on Signal, which limits product functionality and scale.',
        ],
        commDescriptionLong: [
          'Comm leverages keyservers to support sophisticated community functionality, including channels, roles, threads, and much more.',
        ],
      },
      {
        title: 'Identity',
        comingSoon: false,
        competitorDescriptionShort:
          'Your identity on Signal is linked to a phone number.',
        commDescriptionShort:
          'Comm accounts are associated with a username or an Ethereum wallet',
        competitorDescriptionLong: [
          'Your identity on Signal is linked to a phone number, which limits the anonymity and sovereignty of user accounts.',
        ],
        commDescriptionLong: [
          'Comm accounts can be linked either to a pseudonymous username or to an Ethereum wallet.',
        ],
      },
      {
        title: 'Key resets',
        comingSoon: false,
        competitorDescriptionShort:
          "Signal's servers can reset anybody's public keys in order to facilitate account recovery.",
        commDescriptionShort:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys.',
        competitorDescriptionLong: [
          'Signal\'s servers have the ability to reset any phone number\'s public keys at any time. This functionality is used to facilitate account recovery. Signal relies on users manually verifying "Safety Numbers" in order to verify that a public key reset is valid.',
        ],
        commDescriptionLong: [
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys. Note that if the user forgets the secret securing their backup, they will not be able to recover their account.',
        ],
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
        competitorDescriptionLong: [
          'Signal has a single function to mute notifs from a chat.',
        ],
        commDescriptionLong: [
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate "Background" tab in order to avoid cluttering your inbox.',
        ],
      },
    ],
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    featureComparison: [
      {
        title: 'Backup',
        comingSoon: true,
        competitorDescriptionShort:
          'Telegram does not back up your data. Data is stored locally on your device.',
        commDescriptionShort:
          'Comm backs up all of your encrypted user data via our backup service.',
        competitorDescriptionLong: [
          'With the exception of some group membership information, Telegram does not back up your data. The only way to transfer data from an old phone to a new phone is via P2P transfer, which is not always possible.',
        ],
        commDescriptionLong: [
          'Comm backs up all of your user data via our backup service. The backup is encrypted so that Comm is not able to access the data.',
        ],
        furtherReadingLinks: [
          'https://signal.org/blog/signal-private-group-system/',
        ],
      },
      {
        title: 'Communities',
        comingSoon: false,
        competitorDescriptionShort:
          'Telegram does not support communities with channels à la Discord or Slack.',
        commDescriptionShort:
          'Comm supports communities with features including channels, roles, threads, and more.',
        competitorDescriptionLong: [
          'While Telegram supports group chats, it does not support communities with channels à la Discord or Slack. There are no user-owned backends on Signal, which limits product functionality and scale.',
        ],
        commDescriptionLong: [
          'Comm leverages keyservers to support sophisticated community functionality, including channels, roles, threads, and much more.',
        ],
      },
      {
        title: 'Identity',
        comingSoon: false,
        competitorDescriptionShort:
          'Your identity on Signal is linked to a phone number.',
        commDescriptionShort:
          'Comm accounts are associated with a username or an Ethereum wallet',
        competitorDescriptionLong: [
          'Your identity on Signal is linked to a phone number, which limits the anonymity and sovereignty of user accounts.',
        ],
        commDescriptionLong: [
          'Comm accounts can be linked either to a pseudonymous username or to an Ethereum wallet.',
        ],
      },
      {
        title: 'Key resets',
        comingSoon: false,
        competitorDescriptionShort:
          "Signal's servers can reset anybody's public keys in order to facilitate account recovery.",
        commDescriptionShort:
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys.',
        competitorDescriptionLong: [
          'Signal\'s servers have the ability to reset any phone number\'s public keys at any time. This functionality is used to facilitate account recovery. Signal relies on users manually verifying "Safety Numbers" in order to verify that a public key reset is valid.',
        ],
        commDescriptionLong: [
          'Comm backs up user keys, and facilitates account recovery by recovering those original keys. Note that if the user forgets the secret securing their backup, they will not be able to recover their account.',
        ],
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
        competitorDescriptionLong: [
          'Signal has a single function to mute notifs from a chat.',
        ],
        commDescriptionLong: [
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate "Background" tab in order to avoid cluttering your inbox.',
        ],
      },
    ],
  },
});

export { competitorData };
