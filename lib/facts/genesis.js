// @flow

type Genesis = {
  +id: string,
  +name: string,
  +description: string,
  +introMessages: $ReadOnlyArray<string>,
};

const genesis: Genesis = {
  id: '1',
  name: 'GENESIS',
  description:
    'This is the first community on Comm. In the future it will be possible to create chats outside of a community, but for now all of these chats get set with GENESIS as their parent. GENESIS is hosted on Ashoat’s keyserver.',
  introMessages: [
    'welcome to Genesis!',
    'for now, Genesis is the only community on Comm, and is the parent of all new chats',
    'this is meant to be temporary. we’re working on support for chats that can exist outside of any community, as well as support for user-hosted communities',
    'to learn more about our roadmap and how Genesis fits in, check out [this document](https://www.notion.so/Comm-Genesis-1059f131fb354250abd1966894b15951)',
  ],
};

export default genesis;
