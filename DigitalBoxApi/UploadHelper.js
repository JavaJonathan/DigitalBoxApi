const { google } = require("googleapis");
const AuthorizationHelper = require("./AuthorizationHelper");
const fs = require("fs");
const FileHelper = require("./FileHelper");

exports.UpdateJsonFile = async (drive) => {
  var fileMetadata = {
    name: "orders.json",
  };
  var media = {
    mimeType: "text/plain",
    body: fs.createReadStream("orders.json"),
  };
  drive.files.update(
    {
      fileId: `${FileHelper.JsonFileId}`,
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
