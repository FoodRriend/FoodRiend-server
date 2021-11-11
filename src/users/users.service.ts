import {
  ConflictException,
  ConsoleLogger,
  ForbiddenException,
  HttpCode,
  HttpException,
  HttpStatus,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateUserDto, PatchUserDto } from './dto/create-user.dto';
import { Users } from '../entities/Users.entity';
import { Friend_List } from '../entities/Friend_List.entity';
import { Write_Board } from '../entities/Write_Board.entity';
import { Bookmark } from '../entities/Bookmark.entity';
import { Hashtag } from '../entities/Hashtag.entity';
import { Shop_Info } from '../entities/Shop_Info.entity';
import { BookmarkType } from '../search/bookmark.type';
import { Upload_Image } from '../entities/Upload_Image.entity';
import { DeleteUserDto } from './dto/delete-user.dto';

@Injectable()
export class UsersService {
  @InjectRepository(Users)
  private readonly usersRepository: Repository<Users>;
  @InjectRepository(Friend_List)
  private readonly friendListRepository: Repository<Friend_List>;
  @InjectRepository(Write_Board)
  private readonly writeBoardRepository: Repository<Write_Board>;
  @InjectRepository(Bookmark)
  private readonly bookmarkRepository: Repository<Bookmark>;
  @InjectRepository(Hashtag)
  private readonly hashtagRepository: Repository<Hashtag>;
  @InjectRepository(Shop_Info)
  private readonly shopInfoRepository: Repository<Shop_Info>;
  @InjectRepository(Upload_Image)
  private readonly uploadImageRepository: Repository<Upload_Image>;

  async findOne(kakaoId: bigint): Promise<Users | undefined> {
    const user = await this.usersRepository.findOne({ kakaoId: kakaoId });
    return user;
  }

  async createKakaoId(kakaoId: bigint, loginType: string) {
    const user = await this.usersRepository.save({
      kakaoId: kakaoId,
      loginType: loginType,
    });
    return user;
  }

  async createUserInfo(id: number, body: CreateUserDto) {
    const user = await this.usersRepository.findOne({ id: id });
    const nicknameConfilctCheck = await this.usersRepository.findOne({
      nickname: body.nickname,
    });

    if (Object.keys(body).length === 0) {
      throw new ForbiddenException({
        message: 'Does empty request',
        status: 403,
      });
    }

    if (nicknameConfilctCheck !== undefined) {
      throw new ConflictException({
        message: 'nickname conflict!',
        status: 409,
      });
    }

    for (const key in body) {
      console.log(key, user[key], body[key]);
      user[key] = body[key];
    }

    let createUser;
    if (user.name && user.nickname && user.foodType && user.foodStyle) {
      createUser = await this.usersRepository.save(user);
    } else if (
      !(user.name && user.nickname && user.foodType && user.foodStyle)
    ) {
      return { message: 'not saved in Database' };
    }

    return {
      data: {
        name: createUser.name,
        nickname: createUser.nickname,
        profileImage: createUser.profileImage,
        foodType: createUser.foodType,
        foodStyle: createUser.foodStyle,
      },
      status: 200,
    };
  }

  async getUserInfo(id: number) {
    const user = await this.usersRepository.findOne(
      { id: id },
      {
        select: [
          'email',
          'kakaoId',
          'loginType',
          'name',
          'nickname',
          'profileImage',
          'foodStyle',
          'foodType',
        ],
      },
    );

    const cntFriend = await this.friendListRepository.count({
      user_id: id,
    });

    const customUser = {
      ...user,
      cntFriend: cntFriend,
    };

    const cntAte = await this.writeBoardRepository.count({
      user_id: id,
    });

    const cntWant = await this.writeBoardRepository.count({
      user_id: id,
      best: true,
    });

    const cntBest = await this.bookmarkRepository.count({
      user_id: id,
    });

    const customCounting = {
      ate: cntAte,
      want: cntWant,
      best: cntBest,
    };

    const feedData = await this.writeBoardRepository
      .createQueryBuilder('writeBoard')
      .leftJoinAndSelect('writeBoard.img', 'img')
      .leftJoinAndSelect('writeBoard.hashtag', 'hashtag')
      .leftJoinAndSelect('writeBoard.shopInfo', 'shopInfo')
      .select([
        'img.foodImage',
        'writeBoard.id',
        'writeBoard.rating',
        'writeBoard.reviews',
        'hashtag.tag',
        'shopInfo.title',
        'shopInfo.location',
      ])
      .where('writeBoard.user_id = :id', { id: id })
      .getMany();

    let isData = null;
    let customFeed;
    console.log('feedData', feedData);

    if (feedData.length === 0) {
      isData = false;
      customFeed = feedData.map((el) => {
        el.feedId = el.id;
        delete el.id;
        el.title = el.shopInfo.title;
        el.location = el.shopInfo.location;
        delete el.shopInfo;
        return el;
      });
    } else {
      isData = true;
      customFeed = feedData.map((el) => {
        el.feedId = el.id;
        delete el.id;
        el.title = el.shopInfo.title;
        el.location = el.shopInfo.location;
        delete el.shopInfo;
        return el;
      });
    }

    return {
      data: {
        user: customUser,
        counting: customCounting,
        feed: customFeed,
      },
      status: 200,
      isData: isData,
    };
  }

  async getUserBookmark(type: BookmarkType['wantOrBest'], id: number) {
    let isData = true;
    if (type === 'want') {
      // bookmark에서 user를 찾고, 해당되는 가게의 정보를 준다.
      const wantData = await this.shopInfoRepository
        .createQueryBuilder('shopInfo')
        .leftJoinAndSelect('shopInfo.bookmark', 'bookmark')
        .leftJoinAndSelect('shopInfo.writeBoard', 'writeBoard')
        .leftJoinAndSelect('shopInfo.img', 'img')
        .select([
          'shopInfo.id',
          'shopInfo.title',
          'shopInfo.location',
          'shopInfo.mainImage',
        ])
        .where('bookmark.user_id = :id', { id: id })
        .getMany();
      console.log(wantData);
      const shopWantList = wantData.map((shop) => {
        return {
          shopId: shop.id,
          title: shop.title,
          location: shop.location,
          mainImage: shop.mainImage,
        };
      });
      if (!wantData.length) isData = false;
      return {
        shop: shopWantList,
        status: 200,
        isData: isData,
      };
    } else if (type === 'best') {
      // writeBoard에서 user_id가 일치하는 데이터중, best:true인 데이터만 가져온다.
      const bestData = await this.writeBoardRepository
        .createQueryBuilder('writeBoard')
        .leftJoinAndSelect('writeBoard.shopInfo', 'shopInfo')
        .leftJoinAndSelect('writeBoard.img', 'img')
        .leftJoinAndSelect('writeBoard.hashtag', 'hashtag')
        .select([
          'writeBoard.id',
          'shopInfo.id',
          'shopInfo.title',
          'shopInfo.location',
          'shopInfo.mainImage',
          'img.foodImage',
          'hashtag.tag',
          'writeBoard.rating',
          'writeBoard.reviews',
        ])
        .where('writeBoard.user_id = :id', { id: id })
        .andWhere('writeBoard.best = true')
        .getMany();

      const bestList = bestData.map((data) => {
        return {
          feedId: data.id,
          title: data.shopInfo.title,
          location: data.shopInfo.location,
          img: data.img,
          hashtag: data.hashtag,
          rating: data.rating,
          reviews: data.reviews,
        };
      });
      if (!bestList.length) {
        isData = false;
      }
      return {
        feed: bestList,
        status: 200,
        isData: isData,
      };
    }
  }

  async update(id: number, dto: PatchUserDto) {
    const user = await this.usersRepository.findOne({ id: id });

    if (Object.keys(dto).length === 0) {
      throw new ForbiddenException({
        message: 'Does empty request',
        status: 403,
      });
    }

    for (const reqBody in dto) {
      user[reqBody] = dto[reqBody];
    }

    const updateUser = await this.usersRepository.save(user);

    return {
      data: {
        profileImage: updateUser.profileImage,
        foodType: updateUser.foodType,
        foodStyle: updateUser.foodStyle,
      },
      status: 200,
    };
  }

  async deleteUserInfo(id: number, body: DeleteUserDto) {
    if (!id) {
      throw new NotFoundException({
        message: 'wrong id information!',
        status: 404,
      });
    }
    if (!body.checkDelete) {
      throw new NotAcceptableException({
        message: 'recheck delete agreement',
        status: 406,
      });
    }
    if (id && body.checkDelete) {
      // 1. bookmark 삭제
      await this.bookmarkRepository.delete({ user_id: id });

      // 2. uploadImage 삭제
      const writeBoardId = await this.writeBoardRepository.find({
        user_id: id,
      });
      const writeBoardIdList = writeBoardId.map((writeBoard) => {
        return writeBoard.id;
      });
      await this.uploadImageRepository.delete({
        write_board_id: In(writeBoardIdList),
      });

      // 3. Friend_List 삭제
      await this.friendListRepository
        .createQueryBuilder('friend')
        .delete()
        .from(Friend_List)
        .where('user_id = :userId', { userId: id })
        .orWhere('friend = :friendId', { friendId: id })
        .execute();

      // 4. Hashtag 삭제
      await this.hashtagRepository.delete({
        write_board_id: In(writeBoardIdList),
      });

      // 5. Write_Board 삭제
      await this.writeBoardRepository.delete({
        user_id: id,
      });

      // 6. shopInfo는 삭제하지 않음
      // 7. user정보 삭제
      await this.usersRepository.delete({
        id: id,
      });
      return {
        data: {
          userId: id,
        },
      };
    }
  }
}
