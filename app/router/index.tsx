import {
  listChats,
  createChat,
  updateChat,
  deleteChat,
  searchChats,
  getModels,
  sendMessage,
  regenerateMessage,
  getChat,
} from "./aiChat";
import { getCurrentUser } from "./user";
import { arcadeNoAuthTest, arcadeOAuthDocTest } from "./arcadeTest";
import {
  testGetStockPrice,
  testGetCompanyInfo,
  testGetCompanyNews,
  testGetHistoricalPrices,
} from "./financialMcp";
import {
  getPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  addHolding,
  removeHolding,
  getHoldingDetails,
  getDashboard,
} from "./portfolio";
import {
  generateReport,
  initiateReport,
  streamReport,
  listReports,
  getReport,
  deleteReport,
  publishToChannel,
} from "./report";

export const router = {
  aiChat: {
    list: listChats,
    get: getChat,
    create: createChat,
    update: updateChat,
    delete: deleteChat,
    search: searchChats,
    models: getModels,
    send: sendMessage,
    regenerate: regenerateMessage,
  },
  user: {
    current: getCurrentUser,
  },
  arcadeTest: {
    noAuth: arcadeNoAuthTest,
    oauthDoc: arcadeOAuthDocTest,
  },
  financialMcp: {
    stockPrice: testGetStockPrice,
    companyInfo: testGetCompanyInfo,
    companyNews: testGetCompanyNews,
    historicalPrices: testGetHistoricalPrices,
  },
  portfolio: {
    get: getPortfolio,
    create: createPortfolio,
    update: updatePortfolio,
    delete: deletePortfolio,
    addHolding: addHolding,
    removeHolding: removeHolding,
    getHoldingDetails: getHoldingDetails,
    dashboard: getDashboard,
  },
  report: {
    generate: generateReport,
    initiate: initiateReport,
    stream: streamReport,
    list: listReports,
    get: getReport,
    delete: deleteReport,
    publish: publishToChannel,
  },
};
