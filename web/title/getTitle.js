// @flow

const getTitle = (count: number): string => {
  const title = 'SquadCal';
  if (count > 0) {
    return `${title} (${count})`;
  }
  return title;
};

export default getTitle;
