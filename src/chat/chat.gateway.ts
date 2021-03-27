import { Logger, OnApplicationShutdown } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatDto } from './dto/chat.dto';
import { MessageDto } from './dto/message.dto';
import { UserDto } from './dto/user.dto';

import BOTS from './../logic/bots';

import { delay, Timer } from './../logic/timer';

function createChatForSpam(ids: number[], chats) {
  const chat: ChatDto = chats.find(
    (chat) =>
      JSON.stringify(chat.usersId.sort()) === JSON.stringify(ids.sort()),
  );
  // console.log(' - chat:88 >', chat); // eslint-disable-line no-console
  if (!chat) {
    const newChat: ChatDto = {
      id: chats.length + 1,
      usersId: ids,
      messages: [],
    };
    chats.push(newChat);
  }
}

async function sendGavno(chats: ChatDto[], server: Server) {
  const spamChats = chats.filter((chat) => chat.usersId.indexOf(4) !== -1);
  spamChats.forEach(async (chat) => {
    const delayT = Math.floor(Math.random() * Math.floor(1000));
    await delay(delayT);
    const newMsg: MessageDto = {
      text: 'Gavno',
      id: chat.messages.length + 1,
      isReading: '',
      ovner: BOTS[3].user,
      created: new Date().toISOString(),
    };
    // console.log(' - delayT:110 >', delayT); // eslint-disable-line no-console
    chats[chat.id - 1].messages.push(newMsg);
    server
      .in('chat' + chat.id)
      .emit('getMessage', { msg: newMsg, chatId: chat.id });
  });
}

function userToClient(usr: UserDto) {
  return {
    ...usr,
    status: usr.status === '' ? 'Ofline' : 'Online',
  };
}

@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() wss: Server;

  private logger: Logger = new Logger('ChatGateway');

  private chats: ChatDto[] = [];
  private users: UserDto[] = [];

  private typingMsg: any = {};

  private timer = Timer();

  //Server
  afterInit(/* server: Socket */) {
    this.logger.log('Initialie ');
    BOTS.forEach(({ user }) => this.users.push(user));
    this.timer.start(10000, sendGavno, this.chats, this.wss);
    this.timer.stop(6000000); /// kill timer afeter (time)
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected:     ${client.id}`);
    client.emit('checkUser');
    client.emit(
      'getUsers',
      this.users.map((user) => userToClient(user)),
    );
  }

  handleDisconnect(client: Socket) {
    //change status and client id (?)
    const index = this.users.findIndex((user) => user.status == client.id);
    if (index !== -1) {
      this.users[index].status = '';
      this.wss.emit('updateUserStatus', this.users[index]);
    }
    this.logger.log(`Client disconnected:  ${client.id}`);
  }

  //Users

  @SubscribeMessage('newUser')
  handleNewUser(client: Socket, user: UserDto) {
    const newUser: UserDto = {
      ...user,
      id: this.users.length + 1,
      status: `${client.id}`,
    };
    this.users.push(newUser);
    client.emit('getUser', userToClient(newUser));
    this.wss.emit('updateUserStatus', userToClient(newUser));

    //spam bot
    createChatForSpam([newUser.id, 4], this.chats);
  }
  //Combine newUser and checkUser
  @SubscribeMessage('checkUser')
  handleCheckUser(client: Socket, user: UserDto) {
    let id;
    if (
      !(this.users[user.id - 1] && this.users[user.id - 1].name === user.name)
    ) {
      const newUser: UserDto = {
        ...user,
        id: this.users.length + 1,
        status: `${client.id}`,
      };
      id = newUser.id;
      this.users.push(newUser);
      client.emit('getUser', userToClient(newUser));
      this.wss.emit('updateUserStatus', userToClient(newUser));
    } else {
      id = user.id;
      this.users[user.id - 1].status = `${client.id}`;
      client.emit('getUser', userToClient(this.users[user.id - 1]));
      this.wss.emit('updateUserStatus', userToClient(this.users[user.id - 1]));
    }

    createChatForSpam([id, 4], this.chats);
  }
  ///////////////
  //Messages
  @SubscribeMessage('messageToServer')
  handleMessage(
    client: Socket,
    data: { msg: MessageDto; chatId: number },
  ): void {
    const { msg, chatId } = data;
    const index = this.chats.findIndex((c) => c.id === chatId);
    const newMsg: MessageDto = {
      ...msg,
      id: this.chats[index].messages.length + 1,
      created: new Date().toISOString(),
      isReading: '',
    };
    // To user
    this.chats[index].messages.push(newMsg);
    this.wss.in('chat' + chatId).emit('getMessage', { msg: newMsg, chatId });
    this.typing({ uId: newMsg.ovner.id, chatId, client, isWrite: false });

    // To bot
    const toUserId = this.chats[index].usersId
      .filter((id) => msg.ovner.id !== id)
      .pop();

    const bot = BOTS.find(({ user }) => user.id === toUserId);
    if (bot) {
      this.typing({ chatId, uId: bot.user.id });
      bot.getMessage(newMsg.text).then((text) => {
        if (text === false) return;
        const botMsg: MessageDto = {
          text,
          ovner: bot.user,
          created: new Date().toISOString(),
          id: this.chats[index].messages.length + 1,
          isReading: '',
        };
        this.chats[index].messages.push(botMsg);
        this.typing({ chatId, uId: bot.user.id, isWrite: false });
        this.wss
          .in(`chat${chatId}`)
          .emit('getMessage', { msg: botMsg, chatId });
      });
    }
  }

  typing({ chatId, uId, client = null, isWrite = true, delay = 3000 }) {
    const timerKey = `${chatId}_${uId}`;
    if (!isWrite) {
      if (timerKey in this.typingMsg) {
        this.typingMsg[timerKey]();
      }
      return true;
    }
    const c = `chat${chatId}`;
    this.typingMsg[timerKey] = () => {
      clearTimeout(this.typingMsg[timerKey].timer);
      delete this.typingMsg[timerKey];
      // console.log(' - c:210 >', typeof cc); // eslint-disable-line no-console
      // console.log(' - c:210 >', cc); // eslint-disable-line no-console
      // const cc = c(`chat${chatId}`);
      (client ? client.to(c) : this.wss.in(c)).emit('listenWrite', {
        uId,
        isWrite: false,
      });
    };
    const timer = setTimeout(() => {
      console.log(' - 123:210 >', timerKey in this.typingMsg); // eslint-disable-line no-console
      if (timerKey in this.typingMsg) {
        this.typingMsg[timerKey]();
      }
    }, delay);
    this.typingMsg[timerKey].timer = timer;
    const cc = client ? client.to(c) : this.wss.in(c);
    cc.emit('listenWrite', { uId, isWrite: true });
    return true;
  }

  @SubscribeMessage('userWriteMsg')
  handleUserWrite(client: Socket, { chatId, uId }) {
    this.typing({ chatId, uId, client });
  }

  //receive chat messages from server
  @SubscribeMessage('chatFromServer')
  handleChatFromServer(client: Socket, ids: number[]) {
    const chat: ChatDto = this.chats.find(
      (chat) =>
        JSON.stringify(chat.usersId.sort()) === JSON.stringify(ids.sort()),
    );
    if (chat) {
      client.join('chat' + chat.id);
      return { chatId: chat.id, msgs: chat.messages };
    } else {
      const newChat: ChatDto = {
        id: this.chats.length + 1,
        usersId: ids,
        messages: [],
      };
      client.join('chat' + newChat.id);
      this.chats.push(newChat);
      return {
        chatId: newChat.id,
        msgs: newChat.messages,
      };
    }
  }
}
