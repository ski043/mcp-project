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
import { arcadeNoAuthTest, arcadeOAuthDocTest } from "./arcadeTest";

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
  arcadeTest: {
    noAuth: arcadeNoAuthTest,
    oauthDoc: arcadeOAuthDocTest,
  },
};
