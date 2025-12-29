const AuthorizationHelper = require('./AuthorizationHelper');
const LogHelper = require('./LogHelper');

exports.respondToClientWithError = (response, error) => {
  console.log(`An error occurred at ${new Date().toLocaleString()}.`);
  LogHelper.LogError(error);

  if (error.response) {
    let errorCode = error.response.status;
    let errorText = error.response.statusText;

    if (errorCode === 401) {
      AuthorizationHelper.clearAuthToken()
      response.json({
        Orders: [],
        Message: 'You have been logged out, please log in again and retry.',
        Token: AuthorizationHelper.authToken
      });
    } else if (errorText === 'Forbidden' && errorCode === 403) {
      AuthorizationHelper.clearAuthToken()
      response.json({
        Orders: [],
        Message: 'You have been logged out, please log in again and retry.',
        Token: AuthorizationHelper.authToken
      });
    } else if (errorCode === 403) {
      response.json({
        Orders: [],
        Message: 'You have been rate limited, please wait a moment then retry.',
        Token: AuthorizationHelper.authToken
      });
    }
    else if (errorCode === 400) {
      AuthorizationHelper.clearAuthToken()
      response.json({
        Orders: [],
        Message: 'You have been logged out, please log in again and retry.',
        Token: AuthorizationHelper.authToken
      });
    } else {
      console.log(`Error Code: ${error.response}`);
      response.json({
        Orders: [],
        Message: 'Sorry, we encountered an error. Please try again.',
        Token: AuthorizationHelper.authToken
      });
    }
  } else if (`${error}` === 'Error: No access, refresh token or API key is set.') {
    response.json({
      Orders: [],
      Message: 'You have been logged out, please log in again and retry.',
      Token: AuthorizationHelper.authToken
    });
  } else {
    console.log(`Error Code: ${error}`);
    response.json({
      Orders: [],
      Message: 'Sorry, we encountered an error. Please try again.',
      Token: AuthorizationHelper.authToken
    });
  }
};

exports.respondToClient = (response, jsonDB, request, message) => {
  response.json({
    Orders: filterOrders(
      request,
      jsonDB.Orders.sort((a, b) => {
        return sortOrders(a, b);
      })
    ),
    Message: message,
    Token: AuthorizationHelper.authToken
  });
};

exports.respondWithCanceledOrders = (response, orders, request, message) => {
  response.json({
    Orders: filterOrderHistory(
      request,
      orders.sort((a, b) => {
        return sortCancelHistory(a, b);
      })
    ),
    Message: message,
    Token: AuthorizationHelper.authToken
  });
};

exports.respondWithShippedOrders = (response, orders, request, message) => {
  response.json({
    Orders: filterOrderHistory(
      request,
      orders.sort((a, b) => {
        return sortShipHistory(a, b);
      })
    ),
    Message: message,
    Token: AuthorizationHelper.authToken
  });
};

const filterOrders = (request, items) => {
  if ((!request.searchValue || request.searchValue === '') && !request.filters) return items;

  return items.filter(item => {
    if (request.searchValue && request.searchValue !== '') {
      if (request.filters.textSearchTypeFilter === 'orders' && !filterForSearchValue(item, request))
        return false;
    }

    if (request.filters.textSearchTypeFilter === 'notes' && !filterForNotes(item, request))
      return false;

    if (request.filters.marketplaceFilter && !filterForMarketplace(item, request)) return false;

    if (request.filters.priorityFilter && !item.priority) return false;

    return true;
  });
};

const filterOrderHistory = (request, items) => {
  if (!request.searchValue || request.searchValue === '') return items;

  return items.filter(item => {
    return filterForSearchValue(item, request);
  });
};

const filterForSearchValue = (item, request) => {
  //we needed to remove the spaces due to search results not returning
  let filter = request.searchValue
    .replace(/\s/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toLowerCase();

  for (counter = 0; counter < item.FileContents.length; counter++) {
    let orderTitle = item.FileContents[counter].Title.replace(/\s/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toLowerCase();

    let orderNumber = item.FileContents[counter].OrderNumber.replace(/\s/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toLowerCase();

    if (orderTitle.includes(filter) || orderNumber.includes(filter)) return true;
  }
  return false;
};

const filterForNotes = (item, request) => {
  //we needed to remove the spaces due to search results not returning
  if (!item.note) return false;

  return item.note
    .replace(/\s/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toLowerCase()
    .includes(
      request.searchValue
        .replace(/\s/g, '')
        .replace(/[^A-Za-z0-9]/g, '')
        .toLowerCase()
    );
};

const filterForMarketplace = (item, request) => {
  let orderNumber = item.FileContents[0].OrderNumber;

  switch (request.filters.marketplaceFilter) {
    case 'all':
      return true;
    case 'shopify':
      return orderNumber.startsWith('1001');
    case 'ebay':
      return orderNumber.length == 12 && orderNumber.includes('-');
    case 'amazon':
      return orderNumber.length == 19 && orderNumber.includes('-');
    case 'walmart':
      return !orderNumber.includes('-') && !orderNumber.startsWith('1001');
    default:
      return false;
  }
};

const sortOrders = (a, b) => {
  const priorityDiff = (b.priority ? 1 : 0) - (a.priority ? 1 : 0);
  if (priorityDiff && priorityDiff !== 0) return priorityDiff;

  return Date.parse(a.FileContents[0].ShipDate) - Date.parse(b.FileContents[0].ShipDate);
};

const sortShipHistory = (a, b) => {
  return Date.parse(b.shippedOn) - Date.parse(a.shippedOn);
};

const sortCancelHistory = (a, b) => {
  return Date.parse(b.canceledOn) - Date.parse(a.canceledOn);
};
