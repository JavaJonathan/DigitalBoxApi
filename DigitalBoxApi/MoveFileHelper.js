const cancelledFolderId = "1S1LXbXcv1pMvB7HvNJ0jeLDsthGduajw";
const shippedFolderId = "1iQF0GfFcsbQLEA30FL3fw0Vs-K0LxbiV";
const toBeShippedFolder = "1TYJZ67Ghs0oqsBeBjdBfnmb2S7r8kMOU";

let folderId = "";

exports.MoveFiles = async (drive, orders, action) => {
  if (action === "cancel") folderId = cancelledFolderId;
  else if (action === "ship") folderId = shippedFolderId;

  for (let index = 0; index < orders.length; index++) {
    await drive.files.update(
      {
        fileId: orders[index],
        addParents: folderId,
        removeParents: toBeShippedFolder,
        fields: "id, parents",
      },
      function (err, file) {
        if (err) {
          throw err;
        }
      },
    );
  }
};

exports.MoveFilesBack = async (drive, orders) => {
  for (let index = 0; index < orders.length; index++) {
    await drive.files.update(
      {
        fileId: orders[index],
        addParents: toBeShippedFolder,
        removeParents: shippedFolderId,
        fields: "id, parents",
      },
      function (err, file) {
        if (err) {
          throw err;
        }
      },
    );
  }
};
