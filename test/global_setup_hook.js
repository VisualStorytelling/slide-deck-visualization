// jest globalSetup will run as JS, this file allows us to load setup.ts written
// in TypeScript
require("ts-node/register");

module.exports = () => {
  require('./setup.ts');
};
