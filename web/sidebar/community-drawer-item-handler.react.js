// @flow

export type CommunityDrawerItemHandler = {
  +onClick: (event: SyntheticEvent<HTMLElement>) => void,
  +isActive: boolean,
};

export type CommunityDrawerItemCommunityHandler = {
  +onClick: (event: SyntheticEvent<HTMLElement>) => void,
  +expanded: boolean,
  +isActive: boolean,
};
