/* eslint-disable ft-flow/require-valid-file-annotation */

const basePath = process.argv[2];

const fs = require('fs');
const readline = require('readline');
const Writable = require('stream').Writable;

let silenceOutput = false;

const outStream = new Writable({
  write: function (chunk, encoding, callback) {
    if (!silenceOutput) {
      process.stdout.write(chunk, encoding);
    }
    callback();
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: outStream,
  terminal: true,
});

const data = {};

console.log(
  'Your new authoritative keyserver needs to have an owner that is ' +
    'not an owner of any other keyserver registered with ' +
    "the staging Identity service. If the user doesn't exist on the staging " +
    'Identity service, they will be registered. ' +
    'Please provide credentials below.',
);

rl.question('username: ', value1 => {
  data.username = value1;

  rl.question('password: ', value2 => {
    silenceOutput = false;
    rl.output.write('\n');

    data.password = value2;
    writeFiles(data);

    // Close the readline interface
    rl.close();
  });

  silenceOutput = true;
});

function writeFiles(credentials) {
  try {
    const userCredentials = {
      username: credentials.username,
      password: credentials.password,
      usingIdentityCredentials: true,
    };
    const userCredentialsJSON = JSON.stringify(userCredentials, null, 2);
    const keyserverSecrets = `${basePath}/keyserver/secrets`;
    if (!fs.existsSync(keyserverSecrets)) {
      fs.mkdirSync(keyserverSecrets);
    }
    fs.writeFileSync(
      `${keyserverSecrets}/user_credentials.json`,
      userCredentialsJSON,
    );
  } catch (e) {
    console.error(
      'Failure creating configuration files: ' +
        'admin data could not be correctly written',
    );
    throw e;
  }
}
