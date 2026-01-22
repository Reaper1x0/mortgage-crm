const { exec } = require("child_process");

const executeShellCommand = (command, options = {}) => {
  return new Promise((resolve, reject) => {
    exec(command, options, (err, stdout, stderr) => {
      console.log("first");
      if (err) reject(err);
      if (stderr) reject(new Error(stderr));
      console.log({ stdout, stderr });
      resolve(stdout);
    });
  });
};

module.exports = executeShellCommand;
