const fs = require('node:fs');
for (const path of ['dist', 'build']) {
  fs.rmSync(path, {recursive: true, force: true});
  fs.mkdirSync(path, {recursive: true});
}
