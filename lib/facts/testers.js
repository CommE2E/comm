// @flow

type Testers = {
  +name: string,
  +description: string,
  +introMessages: $ReadOnlyArray<string>,
};

const testers: Testers = {
  name: 'OG SquadCal testers',
  description:
    'this thread contains all of the OG testers that helped tested SquadCal over the years!! THANK YOU :)',
  introMessages: [
    'hello my dear SquadCal testers 💗',
    'first of all, thank you SO MUCH for helping to test this app over the last couple years. it means the world to me',
    'we have some big changes coming up:\n1. the app is getting renamed to Comm! we hope to submit Comm to the App Store in the next couple weeks\n' +
      '2. we’re working on updating the app to use E2E encryption so that we don’t have access to your messages\n' +
      '3. after that, we’re aiming to launch a self-hosted communities feature, where you can use your laptop as a server to host a chat community. sort of like Discord, except totally private',
    'as part of moving to E2E encryption, we had to figure out what to do with your existing messages, which are currently stored on my private server',
    'we don’t want to delete your messages, but we also want to be transparent about the fact that I have access to them',
    'the solution we came up with was to move them all into the very first self-hosted community on Comm: Genesis',
    'check out [this link](https://www.notion.so/Comm-Genesis-1059f131fb354250abd1966894b15951) if you want to read more :)',
  ],
};

export default testers;
