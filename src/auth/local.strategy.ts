import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'kakaoId', passwordField: 'loginType' });
  }

  // kakaoId과 loginType을 받아서 validateUser로 전달
  async validate(kakaoId: number, loginType: string): Promise<any> {
    const user = await this.authService.validateUser(kakaoId, loginType);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
