import { ChatDto } from 'src/chat/dto/chat.dto';
import { MessageDto } from 'src/chat/dto/message.dto';
import { UserDto } from 'src/chat/dto/user.dto';

const chatClass = () => {
  const chats: ChatDto[] = [];

  const Chat = () => null;

  Chat.createChat = (users: UserDto[]) => {
    const newChat: ChatDto = {
      id: chats.length + 1,
      users: users,
      messages: [],
      whoWrite: [],
    };
    chats.push(newChat);
    return newChat;
  };

  Chat.checkChat = (users: UserDto[], chatId?: number) => {
    try {
      const chat: ChatDto = chats.find(
        (chat) =>
          JSON.stringify(
            chat.users.sort(function (e1, e2) {
              return e1.id - e2.id;
            }),
          ) ===
          JSON.stringify(
            users.sort(function (e1, e2) {
              return e1.id - e2.id;
            }),
          ),
      );
      if (chat) return chat;
      else return Chat.createChat(users);
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
    return chats[index].messages[msgInd];
  };

  Chat.fncToChatByUser = (user: UserDto, callback: (...args) => void) => {
    const res = {};
    for (let i = 0; i < chats.length; i++) {
      if (chats[i].users.findIndex((u) => u.id === user.id) !== -1)
        res[`${chats[i].id}`] = callback(chats[i]);
    }
    return res;
  };

  Chat.userWrite = (chatId: number, userId: number) => {
    try {
      const chatInd = chats.findIndex((c) => c.id === chatId);
      const userInd =
        chatInd !== -1
          ? chats[chatInd].whoWrite.findIndex((id) => id === userId)
          : false;
      if (userInd && userInd === -1) {
        chats[chatInd].whoWrite.push(userId);
        return chats[chatInd].whoWrite;
      } else return chats[chatInd].whoWrite;
    } catch (e) {
      console.log(' - e:73 >', e); // eslint-disable-line no-console
      // throw new Error(e);
    }
  };

  Chat.userStopWrite = (chatId: number, userId: number) => {
    try {
      const chatInd = chats.findIndex((c) => c.id === chatId);
      const userInd =
        chatInd !== -1
          ? chats[chatInd].whoWrite.findIndex((id) => id === userId)
          : -1;
      if (userInd !== -1) {
        chats[chatInd].whoWrite.splice(userInd, 1);
        return chats[chatInd].whoWrite;
      } else {
        return chats[chatInd].whoWrite;
      }
    } catch (e) {
      throw new Error(e);
    }
  };

  Chat.getAll = () => chats;

  return Chat;
};

export default chatClass;
