const { google } = require("googleapis");
const AuthorizationHelper = require("./AuthorizationHelper");
const fs = require("fs");

let cancelledFolderId = "1_6WgFBHipB7gn3jpn3SSwfIWljT89y_L";
let shippedFolderId = "1Q-XbH5ec5rVE7yiz_z9kelJMtsAuhYyh";
let folderId = "";

exports.MoveFiles = async (drive, orders, action) => {
  if (action === "cancel") folderId = cancelledFolderId;
  else if (action === "ship") folderId = shippedFolderId;

  console.log(orders)

  for (let index = 0; index < orders.length; index++) {
    await drive.files.update(
      {
        fileId: orders[0],
        addParents: folderId,
        removeParents: "1_-sgosO7Pyq5b5ofxrD7z1Bb5uck8q8Z",
        fields: "id, parents",
      },
      function (err, file) {
        if (err) {
          console.log(err);
        } else {
          // File moved.
        }
      }
    );
  }
};
