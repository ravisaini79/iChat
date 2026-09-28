import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Status, StatusSchema } from './schemas/status.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { StatusService } from './status.service';
import { StatusController } from './status.controller';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Status.name, schema: StatusSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ProfilesModule,
  ],
  controllers: [StatusController],
  providers: [StatusService],
  exports: [StatusService, MongooseModule],
})
export class StatusModule {}
