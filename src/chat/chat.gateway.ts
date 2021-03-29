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

import userClass from 'src/logic/user';
import chatClass from 'src/logic/chat';

import BOTS from 'src/logic/bots';

import { delay, Timer } from 'src/logic/timer';

function createChatForSpam(ids: number[], chats) {
  chats.checkChat(ids);
}

async function sendGavno(chats, server: Server) {
  const send = async (chatId: number) => {
    const delayT = Math.floor(Math.random() * Math.floor(1000));
    const gavno: MessageDto = {
      text: 'Gavno',
      ovner: BOTS[3].user,
    };
    await delay(delayT);
    const msg = chats.newMsgToChat(gavno, chatId);
    server.in('chat' + chatId).emit('getMessage', { msg, chatId });
  };
  chats.fncToChatByUser(4, send);
}

function userToClient(usr: UserDto) {
  if (usr)
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
  private chats = chatClass();
  private users = userClass();
  private typingMsg: any = {};
  private timer = Timer();

  //Server
  afterInit(/* server: Socket */) {
    this.logger.log('Initialie ');
    BOTS.forEach(({ user }) => this.users.createUser(user, user.status));
    this.timer.start(10000, sendGavno, this.chats, this.wss);
    this.timer.stop(6000000); /// kill timer afeter (time)
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected:     ${client.id}`);
    client.emit('checkUser');
    client.emit('getUsers', this.users.toAll(userToClient));
  }

  handleDisconnect(client: Socket) {
    //change status and client id (?)
    const user = this.users.findByStatus(`${client.id}`);
    if (user) this.users.updateUserStatus(user, '');
    this.logger.log(`Client disconnected:  ${client.id}`);
  }

  //Users
  @SubscribeMessage('checkUser')
  handleCheckUser(client: Socket, user: UserDto) {
    console.log(' - 123:83 >', 123); // eslint-disable-line no-console
    const checkedUser = this.users.checkUser(user, client.id);
    this.wss.emit('updateUserStatus', userToClient(checkedUser));
    this.logger.log(`user ${checkedUser}`);
    return { user: checkedUser };

    ////////////check chat or create
    // createChatForSpam([checkedUser.id, 4], this.chats);
  }
  ///////////////
  //Messages
  @SubscribeMessage('messageToServer')
  handleMessage(
    client: Socket,
    data: { msg: MessageDto; chatId: number },
  ): void {
    const { msg, chatId } = data;
    const newMsg = this.chats.newMsgToChat(msg, chatId);
    // To user
    this.wss.in('chat' + chatId).emit('getMessage', { msg: newMsg, chatId });
    this.typing({ uId: newMsg.ovner.id, chatId, client, isWrite: false });

    // To bot
    const toUserId = this.chats
      .getChatById(chatId)
      .usersId.filter((id) => msg.ovner.id !== id)
      .pop();

    const bot = BOTS.find(({ user }) => user.id === toUserId);
    if (bot) {
      this.typing({ chatId, uId: bot.user.id });
      bot.getMessage(newMsg.text).then((text) => {
        if (text === false) return;
        let botMsg: MessageDto = {
          text,
          ovner: bot.user,
        };
        botMsg = this.chats.newMsgToChat(botMsg, chatId);
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
      (client ? client.to(c) : this.wss.in(c)).emit('listenWrite', {
        uId,
        isWrite: false,
      });
    };
    const timer = setTimeout(() => {
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
    const chat = this.chats.checkChat(ids);
    client.join('chat' + chat.id);
    return {
      chatId: chat.id,
      msgs: chat.messages,
    };
  }
}
