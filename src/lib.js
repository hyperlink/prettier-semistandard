const Promise = require('bluebird');
const R = require('ramda');
const fs = require('mz/fs');
const prettier = require('prettier');
const linter = require('semistandard');
const recursiveReaddir = Promise.promisify(require('recursive-readdir'));

// Run linter on a string
// :: inCode -> ( Promise -> outCode )
// Note: Standard-engine doesn't support promisify
const lint = code => new Promise(
  (resolve, reject) => linter.lintText(
    code,
    { fix: true },
    (error, result) => error
      ? reject(error)
      : resolve(result.results[0].output || code)
  )
);

const prettierOptions = {
  printWidth: 80,
  tabWidth: 2,
  parser: 'babylon',
  singleQuote: true,
  trailingComma: 'none',
  bracketSpacing: true
};

const setOverrides = override => Object.assign(prettierOptions, override);

// Run prettier on a string
// :: inCode -> outCode
const pretty = code => prettier.format(code, prettierOptions);

// Run formatter on a string
// :: inCode -> ( Promise -> outCode )
const format = R.composeP(
  lint,
  pretty,
  Promise.resolve
);

// Run formatFile on a list of file & dir paths
// :: ignoreGlobs -> filePaths -> ( Promise -> filePaths )
const formatPaths = R.curry((ignore, paths) => R.composeP(
  R.map(formatFile),
  R.unnest,
  Promise.all,
  R.map(path => R.composeP(
    isDir => isDir
      ? recursiveReaddir(path, ignore)
      : [path],
    stat => stat.isDirectory(),
    fs.lstat
  )(path)),
  Promise.resolve
)(paths));

// Run formatter on a file, overwrite it, then return path
// :: filePath -> ( Promise -> filePath )
const formatFile = path => R.composeP(
  R.always(path),
  output => fs.writeFile(path, output),
  format,
  buffer => buffer.toString(),
  fs.readFile
)(path);

module.exports = {
  lint,
  pretty,
  format,
  formatFile,
  formatPaths,
  setOverrides
};
