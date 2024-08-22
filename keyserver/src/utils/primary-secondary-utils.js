// @flow

export const isPrimaryNode: boolean = process.env.COMM_NODE_ROLE
  ? process.env.COMM_NODE_ROLE === 'primary'
  : true;

export const isSecondaryNode: boolean = process.env.COMM_NODE_ROLE
  ? process.env.COMM_NODE_ROLE === 'secondary'
  : false;

export const isAuxiliaryNode: boolean = process.env.COMM_NODE_ROLE
  ? process.env.COMM_NODE_ROLE === 'auxiliary'
  : false;
