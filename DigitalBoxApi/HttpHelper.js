const AuthorizationHelper = require("./AuthorizationHelper");
const LogHelper = require("./LogHelper");

exports.respondToClientWithError = (response, error) => {
  console.log(`An error occurred at ${new Date().toLocaleString()}.`);
  LogHelper.LogError(error);

  if (error.response) {
    let errorCode = error.response.status;
    let errorText = error.response.statusText;

    if (errorCode === 401) {
      response.json({
        Orders: [],
        Message: "You have been logged out, please log in again and retry.",
        Token: AuthorizationHelper.authToken,
      });
    } else if (errorText === "Forbidden" && errorCode === 403) {
      response.json({
        Orders: [],
        Message: "You have been logged out, please log in again and retry.",
        Token: AuthorizationHelper.authToken,
      });
    } else if (errorCode === 403) {
      response.json({
        Orders: [],
        Message: "You have been rate limited, please wait a moment then retry.",
        Token: AuthorizationHelper.authToken,
      });
    } else {
      console.log(`Error Code: ${error.response}`);
      response.json({
        Orders: [],
        Message: "Sorry, we encountered an error. Please try again.",
        Token: AuthorizationHelper.authToken,
      });
    }
  } else if (
    `${error}` === "Error: No access, refresh token or API key is set."
  ) {
    response.json({
      Orders: [],
      Message: "You have been logged out, please log in again and retry.",
      Token: AuthorizationHelper.authToken,
    });
  } else {
    console.log(`Error Code: ${error}`);
    response.json({
      Orders: [],
      Message: "Sorry, we encountered an error. Please try again.",
      Token: AuthorizationHelper.authToken,
    });
  }
};

exports.respondToClient = (response, jsonDB, request, message) => {
  response.json({
    Orders: filterOrders(
      request,
      jsonDB.Orders.sort((a, b) => {
        return sortOrders(a, b)
      }),
    ),
    Message: message,
    Token: AuthorizationHelper.authToken,
  });
};

exports.respondWithCanceledOrders = (response, orders, request, message) => {
  response.json({
    Orders: filterOrders(
      request,
      orders.sort((a, b) => {
        return sortOrders(a, b)
      }),
    ),
    Message: message,
    Token: AuthorizationHelper.authToken,
  });
};

exports.respondWithShippedOrders = (response, orders, request, message) => {
  response.json({
    Orders: filterOrders(
      request,
      orders.sort((a, b) => {
        return sortOrders(a, b)
      }),
    ),
    Message: message,
    Token: AuthorizationHelper.authToken,
  });
};

const filterOrders = (request, items) => {
  if (!request.Filter || request.Filter === "") return items;

  return items.filter((item) => {
    return shouldBeFiltered(item, request);
  });
};

const shouldBeFiltered = (item, request) => {
  //we needed to remove the spaces due to search results not returning
  let filter = request.Filter.replace(/\s/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toLowerCase();

  for (counter = 0; counter < item.FileContents.length; counter++) {
    let orderTitle = item.FileContents[counter].Title.replace(/\s/g, "")
      .replace(/[^A-Za-z0-9]/g, "")
      .toLowerCase();

    let orderNumber = item.FileContents[counter].OrderNumber.replace(/\s/g, "")
      .replace(/[^A-Za-z0-9]/g, "")
      .toLowerCase();

    if (orderTitle.includes(filter) || orderNumber.includes(filter))
      return true;
  }
  return false;
};

const sortOrders = (a, b) => {
  const priorityDiff = b.priority - a.priority;
  if (priorityDiff && priorityDiff !== 0) return priorityDiff;

  return Date.parse(a.FileContents[0].ShipDate) -  Date.parse(b.FileContents[0].ShipDate);
}
