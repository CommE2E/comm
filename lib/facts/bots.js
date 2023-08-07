// @flow

type Bots = {
  +commbot: {
    +userID: string,
    +staffThreadID: string,
  },
};

const bots: Bots = {
  commbot: {
    userID: '5',
    staffThreadID: process.env['KEYSERVER'] ? '83794' : '256|83794',
  },
};

export default bots;
