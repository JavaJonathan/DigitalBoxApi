const HttpHelper = require("./HttpHelper");
const LogHelper = require("./LogHelper");
const FileHelper = require("./FileHelper");
const AuthorizationHelper = require("./AuthorizationHelper");

exports.SearchOrders = async (request, response) => {
  try {
    let googleDrive = await AuthorizationHelper.authorizeWithGoogle(request.token);
    let jsonDB = await FileHelper.getJSONFile(googleDrive);
    HttpHelper.respondToClient(
      response,
      jsonDB,
      request,
      "Search results returned successfully!", // TO DO: Get the message from the file helper so you always know when the last time the db was updated
    );
  } catch (error) {
    HttpHelper.respondToClientWithError(response, error);
    LogHelper.LogError(error);
  }
};
