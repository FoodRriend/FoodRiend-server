import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('ACCESS_SECRET'),
      // secretOrKey: `${process.env.ACCESS_SECRET}`,
      // secretOrKey: process.env.ACCESS_SECRET,
      // secretOrKey: 'IAMIRONMAN',
    });
    console.log('JwtStrategy.......');
  }

  async validate(payload: any) {
    return { userId: payload.id, email: payload.email };
  }
}
