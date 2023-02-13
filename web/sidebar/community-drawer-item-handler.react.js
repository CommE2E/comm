// @flow

export type CommunityDrawerItemHandler = {
  +onClick: (event: SyntheticEvent<HTMLElement>) => void,
  +isActive: boolean,
};
