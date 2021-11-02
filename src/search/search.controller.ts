import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { CreateSearchDto } from './dto/create-search.dto';
import { UpdateSearchDto } from './dto/update-search.dto';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { BookmarkType } from './bookmark.type';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @UseGuards(JwtAuthGuard)
  @Get('feed/:id')
  mainPage(@Param('id') id: number) {
    return this.searchService.mainPage(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('result/:id')
  findResult(@Param('id') id: number, @Query('search_query') query: string) {
    return this.searchService.findResult(id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('friend/:id')
  findFriend(@Param('id') id: number, @Query('search_query') query: string) {
    return this.searchService.findFriend(id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('bookmark/:type/:id')
  bookmark(
    @Param('type') type: BookmarkType['wantOrBest'],
    @Param('id') id: number,
    @Body() body: CreateBookmarkDto,
  ) {
    return this.searchService.bookmark(type, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('feed/:id')
  remove(@Param('id') id: string) {}
}
