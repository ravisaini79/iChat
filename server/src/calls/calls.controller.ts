import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { CallsService } from './calls.service';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  async getCallHistory(@GetUser('_id') userId: string) {
    const data = await this.callsService.getUserCallHistory(userId);
    return {
      message: 'Call history retrieved',
      data,
    };
  }

  @Post('sync-logs')
  async syncDeviceCallLogs(
    @GetUser('_id') userId: string,
    @Body('logs') logs: any[],
  ) {
    const data = await this.callsService.syncDeviceCallLogs(userId, logs);
    return {
      message: 'Device call logs synced to database successfully',
      data,
    };
  }
}
