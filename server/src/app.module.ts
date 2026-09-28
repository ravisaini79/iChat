import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ContactsModule } from './contacts/contacts.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { WebsocketModule } from './websocket/websocket.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { MediaModule } from './media/media.module';
import { SearchModule } from './search/search.module';
import { GroupsModule } from './groups/groups.module';
import { StatusModule } from './status/status.module';
import { CallsModule } from './calls/calls.module';
import { BackupModule } from './backup/backup.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI') || 'mongodb://127.0.0.1:27017/ichat',
        serverSelectionTimeoutMS: 5000,
        family: 4,
      }),
    }),
    AuthModule,
    UsersModule,
    ProfilesModule,
    ContactsModule,
    ConversationsModule,
    MessagesModule,
    WebsocketModule,
    CloudinaryModule,
    MediaModule,
    SearchModule,
    GroupsModule,
    StatusModule,
    CallsModule,
    BackupModule,
  ],
})
export class AppModule {}
