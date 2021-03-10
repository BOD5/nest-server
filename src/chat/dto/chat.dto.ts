import { MessageDto } from './message.dto';

export class ChatDto {
  id: number;
  usersId: number[];
  messages: MessageDto[];
}
