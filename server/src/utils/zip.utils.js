const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const makeZip = (folderPath) => {
  const zip = new AdmZip();
  const uploadDir = fs.readdirSync(folderPath);

  for (let i = 0; i < uploadDir.length; i++) {
    const filePath = path.join(folderPath, uploadDir[i]);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      zip.addLocalFile(filePath);
    } else if (stat.isDirectory()) {
      zip.addLocalFolder(filePath, uploadDir[i]);
    }
  }

  return zip.toBuffer();
};

module.exports = makeZip;
