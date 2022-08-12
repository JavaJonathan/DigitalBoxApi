const { google } = require("googleapis");
const AuthorizationHelper = require("./AuthorizationHelper");
const fs = require("fs");
const LogHelper = require("./LogHelper");

let cancelledFolderId = "1S1LXbXcv1pMvB7HvNJ0jeLDsthGduajw";
let shippedFolderId = "1iQF0GfFcsbQLEA30FL3fw0Vs-K0LxbiV";
let folderId = "";

exports.MoveFiles = async (drive, orders, action) => {
  if (action === "cancel") folderId = cancelledFolderId;
  else if (action === "ship") folderId = shippedFolderId;

  for (let index = 0; index < orders.length; index++) {
    await drive.files
      .update(
        {
          fileId: orders[index],
          addParents: folderId,
          removeParents: "1TYJZ67Ghs0oqsBeBjdBfnmb2S7r8kMOU",
          fields: "id, parents",
        },
        function (err, file) {
          if (err) {
            throw err;
          }
        }
      )
      .catch((error) => {
        // here we will need to handle any failures
        //we can save a list of file ids in the db that were supposed to be deleted from the db so the app knows to still filter out those files
        throw error;
      });
  }
};
