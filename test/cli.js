const tape = require('tape');
const childProcess = require('child_process');
const fs = require('fs');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

tape.test('cli', test => {
  test.plan(4);

  test.equal(
    (() => {
      try {
        childProcess.execSync('node ./src/cli.js');
      } catch (e) {
        const out = e.stdout.toString();
        return out.indexOf('Usage\n') > 1;
      }
    })(),
    true,
    'Help should be shown if no args used'
  );

  test.equal(
    childProcess
      .execSync('node ./src/cli.js', {
        input: '\nconsole.log("123")\n\n',
        stdio: 'pipe'
      })
      .toString(),
    `console.log('123');\n`,
    'stdin should be processed if provided'
  );

  rimraf.sync('test/.temp/cli');
  mkdirp.sync('test/.temp/cli');
  fs.writeFileSync('test/.temp/cli/1', '\n    console.log("0")');
  childProcess.execSync('node ./src/cli.js test/.temp/**/1*');
  const longLine =
    'const long_variable_name = something.really.long() + something.else.really.long.that.should.wrap();\n';
  fs.writeFileSync('test/.temp/cli/2', longLine);
  childProcess.execSync('node ./src/cli.js --print-width=120 test/.temp/cli/2');

  test.equal(
    fs.readFileSync('test/.temp/cli/2', 'utf8'),
    longLine,
    'should not wrap lines over 80 characters'
  );

  test.equal(
    fs.readFileSync('test/.temp/cli/1', 'utf8'),
    `console.log('0');\n`,
    'Globs should be processed if stdin not provided'
  );
});
