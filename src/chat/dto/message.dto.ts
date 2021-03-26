import { UserDto } from './user.dto';
export class MessageDto {
  id: number;
  text: string;
  ovner: UserDto;
  isReading: string;
  created: string;
}
