import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Call, CallSchema } from './schemas/call.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { ProfilesModule } from '../profiles/profiles.module';

import { DeviceCallLog, DeviceCallLogSchema } from './schemas/device-call-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Call.name, schema: CallSchema },
      { name: DeviceCallLog.name, schema: DeviceCallLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ProfilesModule,
  ],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService, MongooseModule],
})
export class CallsModule {}
