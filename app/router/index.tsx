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
};
