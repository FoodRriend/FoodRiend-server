import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { isNumber } from 'class-validator';
import { Response } from 'express';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // kakaoId과 loginType으로 유저를 찾거나, 없으면 새로 생성
  async validateUser(kakaoId: bigint, loginType: string): Promise<any> {
    let user = await this.usersService.findOne(kakaoId);
    if (user && user.loginType === loginType) {
      const { password, ...result } = user;
      return result;
    } else if (
      !user &&
      isNumber(kakaoId) &&
      String(kakaoId).length === 10 &&
      loginType === 'Kakao'
    ) {
      user = await this.usersService.createKakaoId(kakaoId, loginType);
      const { ...result } = user;
      return result;
    }
    return null;
  }

  // 문제점, 첫 번째 로그인 시도시(kakaoId 미등록) 정보가 등록이 안됨
  async login(user: any, res: Response) {
    const payload = { id: user.id, kakaoId: user.kakaoId };
    // cookie에 담을 필요가 있음
    const accessToken = this.jwtService.sign(payload);
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      // ms * sec * min * hour * day
      maxAge: 1000 * 60 * 60 * 1 * 1,
      secure: true,
      sameSite: 'none',
    });

    let isNewMember = true;
    if (user.name !== null) {
      isNewMember = false;
    }
    return res.status(201).json({
      userId: user.id,
      isNewMember,
      // access_token: accessToken,
    });
  }

  async logout(req: any, res: any) {
    res.cookie('access_token', 'expired!', {});
    return res.status(200).json({
      message: '로그아웃이 완료되었습니다.',
      status: 200,
    });
  }

  async checkTokenExpires(user: any, res: Response) {
    return res.status(200).json({
      userId: user.userId,
      message: '토큰이 유효합니다.',
      status: 200,
    });
  }
}
