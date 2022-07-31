// @flow

const fs = require('fs');
const { request } = require('gaxios');

const PHABRICATOR_API_TOKEN = process.env.PHABRICATOR_API_TOKEN;
if (!PHABRICATOR_API_TOKEN) {
  console.log('ERROR: Unable to retrieve PHABRICATOR_API_TOKEN.');
  process.exit(1);
}

const getDifferentialDataFromPhabricator = async () => {
  return await request({
    url: 'https://phab.comm.dev/api/differential.query',
    params: {
      'api.token': PHABRICATOR_API_TOKEN,
    },
  });
};

const getRevisionsToBeRemoved = differentialData => {
  const revisionsToBeRemoved = [];
  for (const diff of differentialData.data['result']) {
    if (
      diff['statusName'] === 'Abandonded' ||
      diff['statusName'] === 'Closed'
    ) {
      revisionsToBeRemoved.push(...diff['diffs']);
    }
  }
  return revisionsToBeRemoved;
};

const getGitTagsToBeRemoved = revisionsToBeRemoved => {
  const gitTagsToBeRemoved = [];
  for (const revisionID of revisionsToBeRemoved) {
    gitTagsToBeRemoved.push(`phabricator/base/${revisionID}`);
    gitTagsToBeRemoved.push(`phabricator/diff/${revisionID}`);
  }
  return gitTagsToBeRemoved;
};

const getGitCommandsToBeRun = gitTagsToBeRemoved => {
  return gitTagsToBeRemoved.map(tag => `git push --delete origin tag ${tag}`);
};

const writeGitCommandsScriptToDisk = gitCommandsToBeRun => {
  fs.writeFileSync('tag_removal_script.sh', gitCommandsToBeRun.join('\n'));
};

async function main() {
  const differentialData = await getDifferentialDataFromPhabricator();
  const revisionsToBeRemoved = getRevisionsToBeRemoved(differentialData);
  const gitTagsToBeRemoved = getGitTagsToBeRemoved(revisionsToBeRemoved);
  const gitCommandsToBeRun = getGitCommandsToBeRun(gitTagsToBeRemoved);
  writeGitCommandsScriptToDisk(gitCommandsToBeRun);
  process.exit(0);
}

main();
