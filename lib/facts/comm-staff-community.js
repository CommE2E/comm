// @flow

type CommStaffCommunity = {
  +id: string,
};

const commStaffCommunity: CommStaffCommunity = {
  id: process.env['KEYSERVER'] ? '311733' : '256|311733',
};

export default commStaffCommunity;
