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

function delay(miliseconds) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(1), miliseconds);
  });
}

const Timer = () => {
  let timerId;
  const f = () => {
    return null;
  };
  f.start = (time, func, ...args) => {
    timerId = setInterval(async () => {
      console.log(`after ${time / 1000}sec `);
      await func(...args);
    }, time);
  };
  f.stop = (time) => {
    setTimeout(() => {
      clearInterval(timerId);
      console.log('stop');
    }, time | 0);
  };
  return f;
};

const BOTS = [
  {
    getMessage: async (mgs) => mgs,
    user: {
      id: 1,
      name: 'Echo Bot',
      status: '/chat#echoBot-online',
      avatar: '',
    },
  },
  {
    getMessage: async (msg) => {
      await delay(3000);
      return msg.split('').reverse().join('');
    },
    user: {
      id: 2,
      name: 'Reverce Bot',
      status: '/chat#reverseBot-online',
      avatar: '',
    },
  },
  {
    getMessage: async () => false,
    user: {
      id: 3,
      name: 'Ignore Bot',
      status: '/chat#IgnoreBot-online',
      avatar: '',
    },
  },
  {
    getMessage: async () => false,
    user: {
      id: 4,
      name: 'Spam Bot',
      status: '/chat#ISpamBot-online',
      avatar: '',
    },
  },
];

function createChatForSpam(ids: number[], chats) {
  const chat: ChatDto = this.chats.find(
    (chat) =>
      JSON.stringify(chat.usersId.sort()) === JSON.stringify(ids.sort()),
  );
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
      ovner: 4,
      created: new Date().toISOString(),
    };
    console.log(' - delayT:110 >', delayT); // eslint-disable-line no-console
    // console.log(' - newMsg:110 >', newMsg); // eslint-disable-line no-console
    chats[chat.id - 1].messages.push(newMsg);
    server
      .in('chat' + chat.id)
      .emit('getMessage', { msg: newMsg, chatId: chat.id });
  });
}

@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() wss: Server;

  private logger: Logger = new Logger('ChatGateway');

  private chats: ChatDto[] = [];
  private users: UserDto[] = [];

  private timer = Timer();

  //Server
  afterInit(/* server: Socket */) {
    this.logger.log('Initialie ');
    // client.emit('addUser');
    BOTS.forEach(({ user }) => this.users.push(user));
    this.timer.start(10000, sendGavno, this.chats, this.wss);
    this.timer.stop(6000000);
    // this.users.push(BOTS.Echo.user);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected:     ${client.id}`);
    client.emit('checkUser');
    client.emit('getUsers', this.users);
  }

  @SubscribeMessage('epta')
  handleEpta(client: Socket) {
    console.log(' - epta:50 >'); // eslint-disable-line no-console
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
    client.emit('getUser', newUser);
    this.wss.emit('updateUserStatus', newUser);

    //spam bot
    createChatForSpam([newUser.id, 4], this.chats);
  }
  //Combine newUser and checkUser
  @SubscribeMessage('checkUser')
  handleCheckUser(client: Socket, user: UserDto) {
    if (
      !(this.users[user.id - 1] && this.users[user.id - 1].name === user.name)
    ) {
      const newUser: UserDto = {
        ...user,
        id: this.users.length + 1,
        status: `${client.id}`,
      };
      this.users.push(newUser);
      client.emit('getUser', newUser);
      this.wss.emit('updateUserStatus', newUser);
    } else {
      this.users[user.id - 1].status = `${client.id}`;
      client.emit('getUser', this.users[user.id - 1]);
      this.wss.emit('updateUserStatus', this.users[user.id - 1]);
    }
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
      isReading: '',
    };
    // To user
    this.chats[index].messages.push(newMsg);
    console.log(' - newMsg:105 >', newMsg); // eslint-disable-line no-console
    this.wss.in('chat' + chatId).emit('getMessage', { msg: newMsg, chatId });

    // To bot
    const toUserId = this.chats[index].usersId
      .filter((id) => msg.ovner !== id)
      .pop();

    const bot = BOTS.find(({ user }) => user.id === toUserId);
    if (bot) {
      bot.getMessage(newMsg.text).then((text) => {
        if (text === false) return;
        const botMsg: MessageDto = {
          text,
          ovner: bot.user.id,
          created: new Date().toISOString(),
          id: this.chats[index].messages.length + 1,
          isReading: '',
        };
        this.chats[index].messages.push(botMsg);
        this.wss
          .in(`chat${chatId}`)
          .emit('getMessage', { msg: botMsg, chatId });
      });
    }
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
      console.log(' - chat.messages:118 >', chat.messages); // eslint-disable-line no-console
      return { chatId: chat.id, msgs: chat.messages };
      // client.emit('getChatMessages', { chatId: chat.id, msgs: chat.messages });
    } else {
      const newChat: ChatDto = {
        id: this.chats.length + 1,
        usersId: ids,
        messages: [],
      };
      client.join('chat' + newChat.id);
      this.chats.push(newChat);
      // client.emit('getChatMessages', {
      return {
        chatId: newChat.id,
        msgs: newChat.messages,
      };
      // );
    }
  }
}
