// @flow

export type AndroidNotification = {
  +data: {
    +id?: string,
    +badgeOnly?: string,
    [string]: string,
  },
};
