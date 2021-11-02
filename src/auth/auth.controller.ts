import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { DeleteUserDto } from '../users/dto/delete-user.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @UseGuards(AuthGuard('local'))
  @Post('kakao')
  login(@Req() req, @Res() res: Response) {
    return this.authService.login(req.user, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('createInfo')
  createUserInfo(@Req() req, @Body() body: CreateUserDto) {
    return this.usersService.createUserInfo(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('checkTokenExpires')
  checkToeknExpires(@Req() req, @Res() res: Response) {
    return this.authService.checkTokenExpires(req.user, res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('logout')
  logout(@Req() req, @Res() res: Response) {
    return this.authService.logout(req, res);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('deleteInfo')
  deleteUserInfo(@Req() req, @Body() body: DeleteUserDto) {
    return this.usersService.deleteUserInfo(req.user.userId, body);
  }
}
