import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FriendService } from './friend.service';
import { FindFriendDto } from './dto/find-friend.dto';
import { AddFriendDto } from './dto/add-friend.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/friend')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @UseGuards(JwtAuthGuard)
  @Post('find')
  findAll(@Body() body: FindFriendDto) {
    return this.friendService.findAll(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('add/:id')
  addFriend(@Param('id') id: number, @Body() body: AddFriendDto) {
    return this.friendService.addFriend(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('list')
  getList(@Req() req) {
    return this.friendService.getList(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:id')
  delete(@Req() req, @Param('id') id: number) {
    return this.friendService.delete(req.user.userId, id);
  }
}
