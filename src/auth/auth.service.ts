import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { isEmail } from 'class-validator';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // email과 loginType으로 유저를 찾거나, 없으면 새로 생성
  async validateUser(email: string, loginType: string): Promise<any> {
    let user = await this.usersService.findOne(email);
    if (user && user.loginType === loginType) {
      const { password, ...result } = user;
      return result;
    } else if (!user && isEmail(email) && loginType === 'Kakao') {
      user = await this.usersService.createEmail(email, loginType);
      const { ...result } = user;
      return result;
    }
    return null;
  }

  // 문제점, 첫 번째 로그인 시도시(email 미등록) 정보가 등록이 안됨
  async login(user: any, res: any) {
    const payload = { id: user.id, email: user.email };
    // cookie에 담을 필요가 있음
    const accessToken = this.jwtService.sign(payload);
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      // ms * sec * min * hour * day
      maxAge: 1000 * 60 * 60 * 1 * 1,
      secure: true,
      sameSite: 'None',
    });
    return res.status(201).json({
      userId: user.id,
      // access_token: accessToken,
    });
  }
}
