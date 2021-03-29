import { ChatDto } from 'src/chat/dto/chat.dto';
import { MessageDto } from 'src/chat/dto/message.dto';

const chatClass = () => {
  const chats: ChatDto[] = [];

  const Chat = () => null;

  Chat.createChat = (ids: number[]) => {
    const newChat: ChatDto = {
      id: chats.length + 1,
      usersId: ids,
      messages: [],
    };
    chats.push(newChat);
    return newChat;
  };

  Chat.checkChat = (ids: number[]) => {
    try {
      const chat: ChatDto = chats.find(
        (chat) =>
          JSON.stringify(chat.usersId.sort()) === JSON.stringify(ids.sort()),
      );
      if (chat) return chat;
      else return Chat.createChat(ids);
    } catch (err) {
      throw new Error(err);
    }
  };

  Chat.getMessages = (chatId: number) => Chat.getChatById(chatId).messages;

  Chat.newMsgToChat = (msg: MessageDto, chatId: number) => {
    const index = chats.findIndex((c) => c.id === chatId);
    const newMsg: MessageDto = {
      ...msg,
      id: chats[index].messages.length + 1,
      created: new Date().toISOString(),
      isReading: '',
    };
    chats[index].messages.push(newMsg);
    return newMsg;
  };

  Chat.getChatById = (chatId: number) => chats.find((c) => c.id === chatId);

  Chat.getMsgById = (chatId: number, msgId: number) => {
    return Chat.getChatById(chatId).messages.find((m) => m.id === msgId);
  };
  //change msg status
  Chat.changeMsgStatus = (chatId: number, msgId: number, newStatus: string) => {
    const index = chats.findIndex((c) => c.id === chatId);
    const msgInd = chats[index].messages.findIndex((m) => m.id === msgId);
    chats[index].messages[msgInd].isReading = newStatus;
  };

  Chat.fncToChatByUser = (userId: number, callback: (...args) => void) => {
    for (let i = 0; i < chats.length; i++) {
      if (chats[i].usersId.indexOf(userId) !== -1) callback(chats[i].id);
    }
  };

  return Chat;
};

export default chatClass;
