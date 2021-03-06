const { Writable } = require('stream');
const esprima = require('esprima');
const fs = require('fs');
const safe = require('safe-regex');
const color = require('colors-cli/safe');

const error = color.red.bold;
const notice = color.magenta;
const warn = color.red;

class RedosScanner extends Writable {
  constructor() {
    super();
    this.issues = {};
  }

  _write(filePath, enc, next) {
    const instance = this;
    fs.readFile(filePath, 'utf8', handleFile);

    function handleFile(err, file) {
      try {
        esprima.tokenize(file, { loc: true, range: true, comment: true }, handleToken(instance, filePath));
      } catch (err) { } // eslint-disable-line
      next();
    }
  }

  displayIssues() {
    console.log(error('Was found the following issues'));
    Object.keys(this.issues)
      .forEach((key) => {
        console.error(notice(`\n${key}`));

        this.issues[key]
          .forEach((issue) => {
            console.error(warn(issue.regexp), 'on line', issue.line, 'column', issue.column);
          });
      });
  }
}

module.exports = RedosScanner;

function handleToken(instance, filePath) {
  const ignoredLines = [];
  return (node) => {
    
    if (isLineDisabled(node)) {
      ignoredLines.push(node.loc.start.line);
    }

    if (node.type === 'RegularExpression' && !ignoredLines.includes(node.loc.start.line - 1)) {
      if (!safe(node.value)) {
        if (!instance.issues[filePath]) {
          instance.issues[filePath] = []; // eslint-disable-line
        }

        const issue = {
          regexp: node.value,
          line: node.loc.start.line,
          column: node.loc.start.column,
        };

        instance.issues[filePath].push(issue);
      }
    }
  };
}

function isLineDisabled(node) {
  return /LineComment/.test(node.type) && node.value === ' redosy-disable-next-line';
}
