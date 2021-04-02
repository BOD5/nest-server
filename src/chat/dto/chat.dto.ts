import { MessageDto } from './message.dto';
import { UserDto } from './user.dto';

export class ChatDto {
  id: number;
  users: UserDto[];
  messages: MessageDto[];
  whoWrite?: number[];
}
