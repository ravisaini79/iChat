import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ContactsService } from './contacts.service';
import { SyncContactsDto } from './dto/sync-contacts.dto';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post('sync')
  async syncContacts(
    @GetUser('_id') userId: string,
    @Body() dto: SyncContactsDto,
  ) {
    return this.contactsService.syncContacts(userId, dto);
  }

  @Delete('sync')
  async purgeContacts(@GetUser('_id') userId: string) {
    return this.contactsService.purgeContacts(userId);
  }

  @Get('ichat-users')
  async getIChatUsers(@GetUser('_id') userId: string) {
    return this.contactsService.getAllRegisteredIChatUsers(userId);
  }
}
