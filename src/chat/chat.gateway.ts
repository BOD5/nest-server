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
import { timeStamp } from 'node:console';

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
  chats.fncToChatByUser(BOTS[3].user, send);
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
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected:  ${client.id}`);
  }

  //Users
  @SubscribeMessage('checkUser')
  handleCheckUser(client: Socket, user: UserDto) {
    const checkedUser = this.users.checkUser(user, 'Online');
    this.wss.emit('updateUserStatus', checkedUser);
    const usersToClient = this.users.getAll().map((u) => {
      return {
        user: u,
        chatId: this.chats.checkChat([checkedUser, u]).id,
      };
    });
    // console.log(' - usersToClient:80 >', usersToClient); // eslint-disable-line no-console
    client.emit('getUsers', usersToClient);
    createChatForSpam([checkedUser.id, 4], this.chats);
    return { user: checkedUser };

    ////////////check chat or create
  }
  @SubscribeMessage('userGoOffline')
  handleUserGoOffline(client: Socket, user: UserDto) {
    try {
      const checkedUser = this.users.updateUserStatus(user, 'Offline');
      this.wss.emit('updateUserStatus', checkedUser);
    } catch (e) {
      this.logger.log(e);
      throw new Error(e);
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
    const newMsg = this.chats.newMsgToChat(msg, chatId);
    // To user
    this.wss.in('chat' + chatId).emit('getMessage', { msg: newMsg, chatId });
    this.typing({ uId: newMsg.ovner.id, chatId, client, isWrite: false });
    // To bot
    const toUser = this.chats
      .getChatById(chatId)
      .users.filter((u) => msg.ovner.id !== u.id)
      .pop();

    const bot = BOTS.find(({ user }) => user.id === toUser.id);
    if (bot) {
      this.chats.changeMsgStatus(chatId, newMsg.id, new Date().toISOString());
      this.wss
        .in('chat' + chatId)
        .emit('updateMsgStatus', { msg: newMsg, chatId });
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

  async typing({ chatId, uId, client = null, isWrite = true, delay = 3000 }) {
    const timerKey = `${chatId}_${uId}`;
    if (!isWrite) {
      if (timerKey in this.typingMsg) {
        this.typingMsg[timerKey]();
      }
      return true;
    }
    const c = `chat${chatId}`;
    this.typingMsg[timerKey] = () => {
      const writes = this.chats.userStopWrite(chatId, uId);
      clearTimeout(this.typingMsg[timerKey].timer);
      delete this.typingMsg[timerKey];
      console.log(' - writes:161 >', writes); // eslint-disable-line no-console
      (client ? client.to(c) : this.wss.in(c)).emit('listenWrite', {
        writes,
      });
    };
    const timer = setTimeout(() => {
      if (timerKey in this.typingMsg) {
        this.typingMsg[timerKey]();
      }
    }, delay);
    const writes = this.chats.userWrite(chatId, uId);
    this.typingMsg[timerKey].timer = timer;
    console.log(' - writes:161 >', writes); // eslint-disable-line no-console
    const cc = client ? client.to(c) : this.wss.in(c);
    cc.emit('listenWrite', { writes });
    return true;
  }

  @SubscribeMessage('userWriteMsg')
  handleUserWrite(client: Socket, { chatId, uId }) {
    this.typing({ chatId, uId, client });
  }

  //receive chat messages from server
  @SubscribeMessage('chatFromServer')
  handleChatFromServer(client: Socket, { users, chatId }) {
    // const chat = this.chats.checkChat(users);
    let chat;
    if (chatId) chat = this.chats.getChatById(chatId);
    else chat = this.chats.checkChat(users);
    console.log(' - chat:180 >', this.chats.getAll()); // eslint-disable-line no-console
    client.join('chat' + chat.id);
    return {
      chatId: chat.id,
      msgs: chat.messages,
      usersInChat: chat.users,
      writes: chat.whoWrite,
    };
  }
}
