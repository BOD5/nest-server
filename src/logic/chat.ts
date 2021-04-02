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

  Chat.checkChat = (users: UserDto[]) => {
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
  };

  Chat.fncToChatByUser = (user: UserDto, callback: (...args) => void) => {
    for (let i = 0; i < chats.length; i++) {
      if (chats[i].users.findIndex((u) => u.id === user.id) !== -1)
        callback(chats[i].id);
    }
  };

  Chat.userWrite = (chatId: number, userId: number) => {
    try {
      const chatInd = chats.findIndex((c) => c.id === chatId);
      const userInd =
        chatInd !== -1
          ? chats[chatInd].whoWrite.findIndex((id) => id === userId)
          : false;
      console.log(' - chatInd, userInd:83 >', chatInd, ' ', userInd); // eslint-disable-line no-console
      console.log(' - chats[chatInd].whoWrite:84 >', chats[chatInd].whoWrite); // eslint-disable-line no-console
      if (userInd && userInd === -1) {
        chats[chatInd].whoWrite.push(userId);
        console.log(' - chats[chatInd].whoWrite:85 >', chats[chatInd].whoWrite); // eslint-disable-line no-console
        console.log(' - chats[chatInd].whoWrite:85 >', chats[chatInd].whoWrite.length); // eslint-disable-line no-console
        return chats[chatInd].whoWrite;
      } else return [];
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
          : false;
      if (userInd) {
        console.log(
          ' - chats[chatInd].whoWrite:102 >',
          chats[chatInd].whoWrite,
        ); // eslint-disable-line no-console
        chats[chatInd].whoWrite.splice(userInd, 1);
        return chats[chatInd].whoWrite;
      } else return [];
    } catch (e) {
      throw new Error(e);
    }
  };

  Chat.getAll = () => chats;

  return Chat;
};

export default chatClass;
