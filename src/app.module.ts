import { Module } from '@nestjs/common';
import { ChatGateway } from './chat/chat.gateway';

@Module({
  controllers: [],
  providers: [ChatGateway],
})
export class AppModule {}
