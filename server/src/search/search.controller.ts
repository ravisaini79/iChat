import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @GetUser('_id') userId: string,
    @Query('q') query: string,
  ) {
    const data = await this.searchService.globalSearch(userId, query);
    return {
      message: 'Search query executed',
      data,
    };
  }
}
