import { Logger } from '@nestjs/common';
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

@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() wss: Server;

  private logger: Logger = new Logger('ChatGateway');

  private chats: ChatDto[] = Array(0);
  private users: UserDto[] = Array(0);

  //Compare array
  private compare(a1, a2) {
    return a1.length == a2.length && a1.every((v, i) => v === a2[i]);
  }

  botsActions: { [k: string]: any } = {
    botEcho: (msg) => {
      null;
    },
  };

  //Server
  afterInit(server: Socket) {
    this.logger.log('Initialie ');
    // console.log(' - socket:40 >', socket); // eslint-disable-line no-console
    // console.log(' - server.id:39 >', server); // eslint-disable-line no-console
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
    this.chats[index].messages.push(newMsg);
    this.wss.in('chat' + chatId).emit('getMessage', { msg: newMsg, chatId });
  }

  //receive chat messages from server
  @SubscribeMessage('chatFromServer')
  handleChatFromServer(client: Socket, ids: number[]) {
    const chat: ChatDto = this.chats.find((chat) =>
      this.compare(chat.usersId.sort(), ids.sort()),
    );
    if (chat) {
      client.join('chat' + chat.id);
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
