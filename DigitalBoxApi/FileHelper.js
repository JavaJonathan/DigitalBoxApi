const { google } = require("googleapis");
const async = require("async");
const AuthorizationHelper = require("./AuthorizationHelper");

let fileIds = []

exports.GetFileIds = async (token) => {
  let drive = AuthorizationHelper.authorizeWithGoogle(token);

 await getPdfFiles(drive)
 await getJSONFile(drive)
};

const getJSONFile = (drive) => {    
   return drive.files.get({fileId : '1V4ZTyanGr332Dg_wOtSR67Viyiwexi9F', alt: "media"}).then((response) => {
        console.log(response.data)
    })  
}

const getPdfFiles = async (drive) => {
    var pageToken = null;

   return drive.files.list(
        {
          q: "'1_-sgosO7Pyq5b5ofxrD7z1Bb5uck8q8Z' in parents and trashed=false",
          fields: "nextPageToken, files(id, name)",
          spaces: "drive",
          pageToken: pageToken,
        }).then((response) => { 
            response.data.files.forEach(function (file) {
                console.log("Found file: ", file.name, file.id);
                fileIds.push(file.id)
              });
        })
}
