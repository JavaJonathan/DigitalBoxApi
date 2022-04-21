const { google } = require("googleapis");
const AuthorizationHelper = require("./AuthorizationHelper");
const fs = require("fs");

exports.UpdateJsonFile = async (token) => {
  let drive = AuthorizationHelper.authorizeWithGoogle(token);
  return uploadFile(drive);
};

const uploadFile = (drive) => {
  var fileMetadata = {
    name: "orders.json",
    parents: ["1_-sgosO7Pyq5b5ofxrD7z1Bb5uck8q8Z"],
  };
  var media = {
    mimeType: "text/plain",
    body: fs.createReadStream("orders.json"),
  };
  drive.files.create(
    {
      resource: fileMetadata,
      media: media,
      fields: "id",
    },
    function (err, file) {
      if (err) {
        // Handle error
        console.error(err);
      } else {
        console.log("File Id: ", file.data.id);
      }
    }
  );
};
