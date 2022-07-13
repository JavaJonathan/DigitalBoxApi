const fs = require("fs");

exports.LogError = (error) => {
  let errorLogArray = [];
  let errorObject = {
    Error: error.stack,
    Time: new Date().toLocaleString(),
  };

  if (!fs.existsSync("ErrorLog.json")) {
    errorLogArray.push(errorObject);
    fs.writeFileSync("ErrorLog.json", JSON.stringify(errorLogArray));
  } else {
    errorLogArray = JSON.parse(fs.readFileSync("ErrorLog.json"));
    errorLogArray.push(errorObject);
    fs.writeFileSync("ErrorLog.json", JSON.stringify(errorLogArray));
  }
};
