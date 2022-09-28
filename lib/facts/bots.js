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
    staffThreadID: '83794',
  },
};

export default bots;
