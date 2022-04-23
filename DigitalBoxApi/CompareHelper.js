let fileIdDictionary = {}

exports.CheckForDbUpdates = (fileIds, jsonDB) => {
    let unaccountedFiles = []
    console.log(jsonDB)
    createFileIdDictionary(jsonDB.Orders)
    fileIds.forEach(fileId => {
        if(!fileIdDictionary.hasOwnProperty(fileId)){
            unaccountedFiles.push(fileId)
        }
    })
    console.log(unaccountedFiles)
}
//we create a dictionary with the fileIds for quick searching
const createFileIdDictionary = (orders) => orders.forEach(order => { fileIdDictionary[`${order.FileId}`] = '' })