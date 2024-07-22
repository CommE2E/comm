// @flow

export const isPrimaryNode: boolean = process.env.COMM_NODE_ROLE
  ? process.env.COMM_NODE_ROLE === 'primary'
  : true;
