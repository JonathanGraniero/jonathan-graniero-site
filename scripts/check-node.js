// Fails fast with a readable message when run on an old Node. Deliberately
// written in old-style JS so it parses on any Node version.
var fs = require('fs');
var path = require('path');

var required = Number(fs.readFileSync(path.join(__dirname, '..', '.nvmrc'), 'utf8').trim());
var current = Number(process.versions.node.split('.')[0]);

if (current < required) {
  console.error(
    '\n  This project needs Node ' +
      required +
      '+, but you are running Node ' +
      process.versions.node +
      ' (' +
      process.execPath +
      ').\n\n' +
      '  If you use nvm, run:  nvm install && nvm use\n' +
      '  If `nvm` is not found, your shell is not loading it; see README > Prerequisites.\n',
  );
  process.exit(1);
}
