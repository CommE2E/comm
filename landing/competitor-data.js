// @flow

const competitors = Object.freeze({
  GENERAL: 'general',
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
  general: {
    id: 'general',
    name: 'General',
    featureComparison: [
      {
        title: 'Tree structure',
        comingSoon: false,
        competitorDescriptionShort:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin.',
        commDescriptionShort:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin.',
        competitorDescriptionLong: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin est faucibus eu. Aliquam a nisi id mauris aliquet viverra. Vivamus blandit iaculis libero, vitae hendrerit mi posuere sodales.',
        ],
        commDescriptionLong: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin est faucibus eu. Aliquam a nisi id mauris aliquet viverra. Vivamus blandit iaculis libero, vitae hendrerit mi posuere sodales.',
        ],
      },
      {
        title: 'Muted tab',
        comingSoon: false,
        competitorDescriptionShort:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin.',
        commDescriptionShort:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin.',
        competitorDescriptionLong: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin est faucibus eu. Aliquam a nisi id mauris aliquet viverra. Vivamus blandit iaculis libero, vitae hendrerit mi posuere sodales.',
        ],
        commDescriptionLong: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin est faucibus eu. Aliquam a nisi id mauris aliquet viverra. Vivamus blandit iaculis libero, vitae hendrerit mi posuere sodales.',
        ],
      },
      {
        title: 'Integrated calendar',
        comingSoon: false,
        competitorDescriptionShort:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin.',
        commDescriptionShort:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin.',
        competitorDescriptionLong: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin est faucibus eu. Aliquam a nisi id mauris aliquet viverra. Vivamus blandit iaculis libero, vitae hendrerit mi posuere sodales.',
        ],
        commDescriptionLong: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin est faucibus eu. Aliquam a nisi id mauris aliquet viverra. Vivamus blandit iaculis libero, vitae hendrerit mi posuere sodales.',
        ],
      },
      {
        title: 'Notif controls',
        comingSoon: false,
        competitorDescriptionShort:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin.',
        commDescriptionShort:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin.',
        competitorDescriptionLong: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin est faucibus eu. Aliquam a nisi id mauris aliquet viverra. Vivamus blandit iaculis libero, vitae hendrerit mi posuere sodales.',
        ],
        commDescriptionLong: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin est faucibus eu. Aliquam a nisi id mauris aliquet viverra. Vivamus blandit iaculis libero, vitae hendrerit mi posuere sodales.',
        ],
      },
      {
        title: 'Unique threading model',
        comingSoon: false,
        competitorDescriptionShort:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin.',
        commDescriptionShort:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin.',
        competitorDescriptionLong: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin est faucibus eu. Aliquam a nisi id mauris aliquet viverra. Vivamus blandit iaculis libero, vitae hendrerit mi posuere sodales.',
        ],
        commDescriptionLong: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin est faucibus eu. Aliquam a nisi id mauris aliquet viverra. Vivamus blandit iaculis libero, vitae hendrerit mi posuere sodales.',
        ],
      },
      {
        title: 'Inbox zero workflow',
        comingSoon: false,
        competitorDescriptionShort:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin.',
        commDescriptionShort:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin.',
        competitorDescriptionLong: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin est faucibus eu. Aliquam a nisi id mauris aliquet viverra. Vivamus blandit iaculis libero, vitae hendrerit mi posuere sodales.',
        ],
        commDescriptionLong: [
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vulputate vestibulum leo, vel sollicitudin est faucibus eu. Aliquam a nisi id mauris aliquet viverra. Vivamus blandit iaculis libero, vitae hendrerit mi posuere sodales.',
        ],
      },
    ],
  },
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
          'Discord’s inbox is basically a simple notification queue tucked away in a corner. It merges all tags (including @all tags) into a single interface. Since any member of any channel in a server is able to tag you, normally this interface is relatively low-signal.',
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
          'Comm also supports a threads feature, similar to Discord’s. Comm threads appear in your inbox underneath their parent channel.',
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
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate “Muted” tab in order to avoid cluttering your inbox.',
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
        comingSoon: false,
        competitorDescriptionShort:
          'Keybase has a custom implementation of E2E encryption that doesn’t guarantee forward secrecy.',
        commDescriptionShort:
          'Comm uses the Double Ratchet algorithm. Pioneered by Signal, Double Ratchet is the industry standard for E2E encryption.',
        competitorDescriptionLong: [
          'Keybase’s implementation of E2E encryption is unique in the industry. Whereas most E2E-encrypted messaging apps use something like Signal’s Double Ratchet to preserve forward secrecy, Keybase took a different approach because they wanted to allow new chat members to see the full history of the chat prior to when they joined.',
        ],
        commDescriptionLong: [
          'Comm uses Matrix.org’s implementation of Double Ratchet, and as such is able to preserve forward secrecy. We allow new chat members to see full chat history by querying peers’ keyservers.',
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
          'Keybase, like most other E2E-encrypted apps, is only able to execute search queries on your local device. As such, in order to exhaustively execute a search query for a chat, Keybase must download that chat’s full history to the client device.',
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
          'Keybase’s servers have the ability to reset any account’s public keys at any time. This functionality is used to facilitate account recovery.',
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
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate “Muted” tab in order to avoid cluttering your inbox.',
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
          'Megolm is a “group ratchet” which trades off security/privacy guarantees to enable scale and performance. Many E2E-encrypted apps (such as WhatsApp) use “group ratchets” for group chats.',
        ],
        commDescriptionLong: [
          'Comm uses Matrix’s implementation of Signal’s Double Ratchet algorithm for both two-person and group chats. However, we don’t use Megolm due to concerns over privacy implications.',
          'Instead of using a group ratchet, Comm arranges group chats in a “pairwise” way. When a user sends a message to a group chat, Comm handles that by sending that message individually to all users in the group chat.',
          'The downside is that group chats don’t scale as well. Comm’s solution for large group chats is keyserver-hosted communities, which avoid sacrificing security/privacy guarantees by leveraging keyservers to federate the classic client/server paradigm.',
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
          'Comm backs up all of your user data, encrypted with either a password or an Ethereum wallet.',
        competitorDescriptionLong: [
          'Matrix relies on homeservers to handle backup of unencrypted chats. Backup of encrypted chats is handled differently depending on which implementation of Matrix you’re using.',
          'The most popular implementation of Matrix is Element. Element backs up a group chat’s messages just once for the group, encrypted with the chat keys. Meanwhile, a given user’s chat keys are backed up separately, and encrypted with the user’s Security Phrase/Key.',
        ],
        commDescriptionLong: [
          'Comm backs up all of your user data via our backup service. The backup is encrypted so that Comm is not able to access the data.',
          'Since Comm doesn’t use a group ratchet due to privacy concerns (see “Encryption” section), group chat backups are not shared between users.',
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
          'Comm accounts are associated with a username or an Ethereum wallet.',
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
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate “Muted” tab in order to avoid cluttering your inbox.',
        ],
      },
    ],
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    featureComparison: [
      {
        title: 'Encryption',
        comingSoon: true,
        competitorDescriptionShort:
          'Slack staff is able to read the contents of all messages sent on the app.',
        commDescriptionShort:
          'Comm uses Signal’s Double Ratchet algorithm, the industry standard for E2E encryption.',
        competitorDescriptionLong: [
          'Slack staff is able to read the contents of all messages sent on the app. Their product team hasn’t indicated any interest in privacy or encryption features.',
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
          'Slack separates notifs into individual channels, threads, and DMs within individual communities.',
        commDescriptionShort:
          'Comm has a unified inbox that shows all unread chats across all communities.',
        competitorDescriptionLong: [
          'To sort through notifs from different communities in Slack, you have to navigate into each individual community, and then use the sidebar to navigate into each individual channel, DM, or thread. While there is a feature to sort unread chats first, it’s easy to miss.',
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
          'Slack supports communities with a flat list of channels.',
        commDescriptionShort:
          'Comm allows you to nest channels inside other channels.',
        competitorDescriptionLong: [
          'Slack is built to support communities, also known as “slacks” on the platform. Each “slack” has a flat list of channels.',
        ],
        commDescriptionLong: [
          'Comm’s implementation of communities looks a lot like Slack’s. The core difference is that Comm supports a full tree structure of channels for each community.',
          'Comm also supports a threads feature, similar to Slack’s. Comm threads appear in your inbox underneath their parent channel.',
        ],
      },
      {
        title: 'Notifications',
        comingSoon: false,
        competitorDescriptionShort:
          'Slack has a single function to mute notifs from a chat.',
        commDescriptionShort:
          'Comm allows you to manage notif alerts separately from notif badging.',
        competitorDescriptionLong: [
          'Slack has several features for managing notifs across a whole community. However, when it comes to managing notifs from a specific chat, Slack is more limited. There’s only one option, which is to completely mute a chat.',
        ],
        commDescriptionLong: [
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate “Muted” tab in order to avoid cluttering your inbox.',
        ],
      },
      {
        title: 'Badging',
        comingSoon: false,
        competitorDescriptionShort:
          'Slack’s unread count is based on the number of unread messages.',
        commDescriptionShort:
          'Comm’s unread count is based on the number of unread chats.',
        competitorDescriptionLong: [
          'Slack’s unread count is based on the number of unread messages. If somebody sends 3 messages in a row to the same chat, your unread count will be incremented by 3.',
        ],
        commDescriptionLong: [
          'Comm’s unread count is based on the number of unread chats. If somebody sends 3 messages in a row to the same chat, your unread count will be incremented by 1.',
        ],
      },
      {
        title: 'Unified account',
        comingSoon: false,
        competitorDescriptionShort:
          'Your identity on Slack is specific to a community.',
        commDescriptionShort:
          'Your identity on Comm is universal, and can be shared across communities.',
        competitorDescriptionLong: [
          'Each community on Slack is basically its own walled garden. Each user has a distinct identity for each community, which means a distinct set of DMs and a distinct profile.',
        ],
        commDescriptionLong: [
          'Your identity on Comm is universal, which means you can share the same profile and username across all the communities you’re a part of. Ethereum users can use their ENS name and avatar on Comm.',
          'DMs exist outside the bounds of any particular community, which means you don’t have to maintain multiple conversations with the same user.',
        ],
      },
    ],
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    featureComparison: [
      {
        title: 'Encryption',
        comingSoon: true,
        competitorDescriptionShort:
          'Outside of rarely-used “Secret Chats”, Telegram staff is able to read the contents of all messages sent on the app.',
        commDescriptionShort:
          'Comm uses Signal’s Double Ratchet algorithm, the industry standard for E2E encryption.',
        competitorDescriptionLong: [
          'Despite being presented as a privacy-focused messaging app, Telegram does not offer E2E encryption as a default. While there is a “Secret Chats” feature, it only works for 1-on-1 chats, and those chats only appear on a single primary device.',
        ],
        commDescriptionLong: [
          'Comm’s servers do not have access to plaintext user content. DMs are stored on individual user devices, and communities are hosted on individual users’ keyservers.',
          'Comm uses Matrix’s implementation of Signal’s Double Ratchet algorithm for DMs. Communication between keyservers and user devices is secured via TLS.',
        ],
        furtherReadingLinks: [
          'https://signal.org/docs/specifications/doubleratchet/',
          'https://telegra.ph/Why-Isnt-Telegram-End-to-End-Encrypted-by-Default-08-14',
        ],
      },
      {
        title: 'Communities',
        comingSoon: false,
        competitorDescriptionShort:
          'Telegram has a Topics feature for group chats, but communities aren’t a top-level concept.',
        commDescriptionShort:
          'Comm supports communities as a core primitive, à la Slack or Discord.',
        competitorDescriptionLong: [
          'Telegram has a Topics feature for group chats. It allows group chats with more than 200 members to subdivide into multiple “Topics”. These topics have one level of depth, and it can be annoying to browse topics or to associate topics with a parent chat.',
        ],
        commDescriptionLong: [
          'Comm’s implementation of communities looks a lot like IRC, Slack, or Discord. The core difference is that Comm supports a full tree structure of channels for each community.',
          'Comm also supports a threads feature, also similar to Slack and Discord. Comm threads appear in your inbox underneath their parent channel.',
        ],
        furtherReadingLinks: [
          'https://telegram.org/blog/topics-in-groups-collectible-usernames#topics-in-groups',
        ],
      },
      {
        title: 'Notifications',
        comingSoon: false,
        competitorDescriptionShort:
          'Telegram has a single function to mute notifs from a chat.',
        commDescriptionShort:
          'Comm allows you to manage notif alerts separately from notif badging.',
        competitorDescriptionLong: [
          'Telegram supports temporary muting notifs from a chat, disabling message previews, and changing the notification sound associated with a chat.',
        ],
        commDescriptionLong: [
          'Comm allows you to manage notif alerts separately from notif badging (unread icon). Comm also sorts muted chats in a separate “Muted” tab in order to avoid cluttering your inbox.',
        ],
      },
      {
        title: 'Noisy chats',
        comingSoon: false,
        competitorDescriptionShort:
          'Telegram has a Chat Folders feature, but it’s not easy to move a noisy chat out of your inbox.',
        commDescriptionShort:
          'When you disable notifs for a chat, Comm moves it out of your inbox into a separate Muted tab.',
        competitorDescriptionLong: [
          'Telegram has a Chat Folders feature. Your primary inbox always shows all chats, but Chat Folders can be configured to show or hide a set of selected chats. If you want to separate all of your chats into two Chat Folders, it takes a lot of steps.',
        ],
        commDescriptionLong: [
          'When you disable notifs for a chat, Comm moves it out of your inbox into a separate Muted tab. The Muted tab is a core primitive in Comm, and helps you separate signal from noise.',
        ],
      },
      {
        title: 'Badging',
        comingSoon: false,
        competitorDescriptionShort:
          'Telegram’s unread count is based on the number of unread messages.',
        commDescriptionShort:
          'Comm’s unread count is based on the number of unread chats.',
        competitorDescriptionLong: [
          'Telegram’s unread count is based on the number of unread messages. If somebody sends 3 messages in a row to the same chat, your unread count will be incremented by 3.',
        ],
        commDescriptionLong: [
          'Comm’s unread count is based on the number of unread chats. If somebody sends 3 messages in a row to the same chat, your unread count will be incremented by 1.',
        ],
      },
    ],
  },
});

export { competitors, competitorData };
