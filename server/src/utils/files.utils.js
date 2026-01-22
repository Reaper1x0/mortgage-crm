const fs = require("fs");
const path = require("path");

const writeToFile = (path, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, "utf8", (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

//This accepts a path and an array of text (That needs to written on the directory.)
const writeToDirectory = async (folderPath, textToWrite) => {
  for (const fileName in textToWrite) {
    const completePath = folderPath + "/" + fileName;
    const doesFolderExist = fs.existsSync(path.dirname(completePath));

    if (!doesFolderExist) fs.mkdirSync(path.dirname(completePath));

    await writeToFile(completePath, textToWrite[fileName]);
  }
};

const createDirectory = (path) => {
  return new Promise((resolve, reject) => {
    fs.mkdir(path, { recursive: false }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

const copyDirectory = async (source, destination) => {
  return new Promise((resolve, reject) => {
    fs.cp(source, destination, { recursive: true }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

const deleteDirectoryRecursive = async (directoryPath) => {
  return new Promise((resolve, reject) => {
    fs.rm(directoryPath, { recursive: true, force: true }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

module.exports = {
  writeToFile,
  createDirectory,
  copyDirectory,
  writeToDirectory,
  deleteDirectoryRecursive,
};
