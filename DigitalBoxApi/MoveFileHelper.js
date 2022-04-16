const {google} = require('googleapis');
const AuthorizationHelper = require('./AuthorizationHelper');
const fs = require('fs');

exports.MoveFile = async (token) => {
    let drive = AuthorizationHelper.authorizeWithGoogle(token)
    return moveFileFolder(drive)
}

const moveFileFolder = (drive) => {
    fileId = '1Ht0Bbqo_C37xL4KaWB2YebbLwOHCF7i8'
    folderId = '1_6WgFBHipB7gn3jpn3SSwfIWljT89y_L'
    
    drive.files.update({
    fileId: fileId,
    addParents: folderId,
    removeParents: '1_-sgosO7Pyq5b5ofxrD7z1Bb5uck8q8Z',
    fields: 'id, parents'
}, function (err, file) {
    if (err) {
    console.log(err)
    } else {
    // File moved.
    }
})
}