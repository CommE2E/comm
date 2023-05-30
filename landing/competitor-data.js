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
        title: 'Encryption',
        comingSoon: true,
        competitorDescriptionShort:
          'Discord staff is able to read the contents of all messages sent on the app.',
        commDescriptionShort:
          'Comm uses Signal’s Double Ratchet algorithm, the industry standard for E2E encryption.',
        competitorDescriptionLong: [
          'Discord staff is able to read the contents of all messages sent on the app. Their product team has indicated that they aren’t focused on privacy or encryption features.',
        ],
        commDescriptionLong: [
          'Comm’s servers do not have access to plaintext user content. DMs are stored on individual user devices, and communities are hosted on individual users’ keyservers.',
          'Comm uses Matrix’s implementation of Signal’s Double Ratchet algorithm for DMs. Communication between keyservers and user devices is secured via TLS.',
        ],
        furtherReadingLinks: [
          'https://signal.org/docs/specifications/doubleratchet/',
        ],
      },
      {
        title: 'Inbox',
        comingSoon: false,
        competitorDescriptionShort:
          'Discord’s inbox is basically a simple notification queue tucked away in a corner.',
        commDescriptionShort:
          'Comm’s inbox is the first thing you see when you open the app. It helps separate signal from noise.',
        competitorDescriptionLong: [
          'Discord’s inbox is basically a simple notification queue tucked away in a corner. It merges all tags (including @all tags) into a single interface. Since any member of any channel in a server is able to tag you, typically this interface is relatively low-signal.',
        ],
        commDescriptionLong: [
          'Comm’s inbox is the first thing you see when you open the app. It resembles a typical messaging app, with all of your chats appearing ordered by the most recent message.',
          'Threads appear underneath their parent chat, and when a thread is bumped it bumps the whole parent chat to the top.',
        ],
      },
      {
        title: 'Communities',
        comingSoon: false,
        competitorDescriptionShort:
          'Discord supports communities with a flat list of channels.',
        commDescriptionShort:
          'Comm allows you to nest channels inside other channels.',
        competitorDescriptionLong: [
          'Discord is built to support communities, also known as “servers” on the platform. Each server has a flat list of channels.',
        ],
        commDescriptionLong: [
          'Comm’s implementation of communities looks a lot like Discord’s. The core difference is that Comm supports a full tree structure of channels for each community.',
          'Comm also supports a threads feature, also similar to Discord’s. Comm threads appear in your inbox underneath their parent channel.',
        ],
      },
      {
        title: 'Notifications',
        comingSoon: false,
        competitorDescriptionShort:
          'Discord has a single function to mute notifs from a chat.',
        commDescriptionShort:
          'Comm allows you to manage notif alerts separately from notif badging.',
        competitorDescriptionLong: [
          'Discord has a single function to mute notifs from a chat. You can mute notifs temporarily or permanently.',
        ],
        commDescriptionLong: [
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate “Background” tab in order to avoid cluttering your inbox.',
        ],
      },
      {
        title: 'Badging',
        comingSoon: false,
        competitorDescriptionShort:
          'Discord’s unread count is based on the number of unread messages.',
        commDescriptionShort:
          'Comm’s unread count is based on the number of unread chats.',
        competitorDescriptionLong: [
          'Discord’s unread count is based on the number of unread messages. If somebody sends 3 messages in a row to the same chat, your unread count will be incremented by 3.',
        ],
        commDescriptionLong: [
          'Comm’s unread count is based on the number of unread chats. If somebody sends 3 messages in a row to the same chat, your unread count will be incremented by 1.',
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
          'Signal’s servers have the ability to reset any phone number’s public keys at any time. This functionality is used to facilitate account recovery. Signal relies on users manually verifying “Safety Numbers” in order to verify that a public key reset is valid.',
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
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate “Background” tab in order to avoid cluttering your inbox.',
        ],
      },
    ],
  },
});

export { competitorData };
