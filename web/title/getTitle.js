// @flow

const getTitle = (count: number): string => {
  const title = 'Comm';
  if (count > 0) {
    return `${title} (${count})`;
  }
  return title;
};

export default getTitle;
