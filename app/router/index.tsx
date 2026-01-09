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
};
