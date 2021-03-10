import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { ProductsModule } from './products/products.module';
// import { AppGateway } from './app.gateway';
import { ChatGateway } from './chat/chat.gateway';

@Module({
  imports: [
    // ProductsModule,
    // MongooseModule.forRoot(
    // ),
  ],
  controllers: [],
  providers: [ChatGateway],
})
export class AppModule {}
