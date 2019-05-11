/* eslint-disable import/no-extraneous-dependencies */
import {
  cd, exec, echo, touch,
} from 'shelljs';
import { readFileSync } from 'fs';
import url from 'url';

let repoUrl;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pkg = JSON.parse(readFileSync('package.json') as any);
if (typeof pkg.repository === 'object') {
  if (!Object.prototype.hasOwnProperty.call(pkg.repository, 'url')) {
    throw new Error('URL does not exist in repository section');
  }
  repoUrl = pkg.repository.url;
} else {
  repoUrl = pkg.repository;
}

const parsedUrl = url.parse(repoUrl);
const repository = (parsedUrl.host || '') + (parsedUrl.path || '');
const ghToken = process.env.GH_TOKEN;

echo('Deploying docs!!!');
cd('docs');
touch('.nojekyll');
exec('git init');
exec('git add .');
exec('git config user.name "Kyle Bradford"');
exec('git config user.email "kyle@watchtower.ai"');
exec('git commit -m "docs(docs): update gh-pages"');
exec(
  `git push --force --quiet "https://${ghToken}@${repository}" master:gh-pages`,
);
echo('Docs deployed!!');
