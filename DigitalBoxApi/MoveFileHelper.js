const cancelledFolderId = "1_6WgFBHipB7gn3jpn3SSwfIWljT89y_L";
const shippedFolderId = "1Q-XbH5ec5rVE7yiz_z9kelJMtsAuhYyh";
const toBeShippedFolder = "1_-sgosO7Pyq5b5ofxrD7z1Bb5uck8q8Z";

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
