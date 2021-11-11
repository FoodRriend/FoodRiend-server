import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hashtag } from '../entities/Hashtag.entity';
import { Shop_Info } from '../entities/Shop_Info.entity';
import { Upload_Image } from '../entities/Upload_Image.entity';
import { Write_Board } from '../entities/Write_Board.entity';
import { CreateBoardDto } from './dto/create-board.dto';

@Injectable()
export class BoardService {
  @InjectRepository(Write_Board)
  private readonly boardRepository: Repository<Write_Board>;
  @InjectRepository(Hashtag)
  private readonly hashtagRepository: Repository<Hashtag>;
  @InjectRepository(Shop_Info)
  private readonly shopInfoRepository: Repository<Shop_Info>;
  @InjectRepository(Upload_Image)
  private readonly uploadImageRepository: Repository<Upload_Image>;

  // 같은 이름일 때, 친구가 있어서 저장된 것 + 나머지 + 위치 우선순위
  // google api 에서 가게 정보 받아와서
  // DB 확인후
  // 없으면 저장

  async create(id: number, dto: CreateBoardDto) {
    // 식당이름이 일치하면 거르기
    const existTitle = await this.shopInfoRepository.find({
      where: [{ id: dto.shopId }, { title: dto.title }],
    });

    let chosenShopId: number;
    // shopInfo에 정보가 없는 경우, 입력하고 id값을 shopId로 사용하기
    if (existTitle.length === 0) {
      const newShopInfo = await this.shopInfoRepository.save({
        mainImage: dto.mainImage,
        foodCategory: dto.foodCategory,
        menu: dto.menu,
        contact: dto.contact,
        title: dto.title,
        location: dto.location,
      });
      chosenShopId = newShopInfo.id;
    } else if (existTitle.length) chosenShopId = existTitle[0].id;

    // const writeBoard = await this.boardRepository
    //   .createQueryBuilder()
    //   .insert()
    //   .into(Write_Board)
    //   .values({
    //     user_id: id,
    //     rating: dto.rating,
    //     best: false,
    //     isDeleted: false,
    //     house_info_id: chosenShopId,
    //     reviews: dto.reviews,
    //   })
    //   .orIgnore()
    //   .execute();

    const findBoard = await this.boardRepository.find({
      where: { user_id: id, house_info_id: chosenShopId },
    });

    // 게시물 수정 로직은 따로 만드는 것이 좋을 것 같다.
    // 이미 등록된 게시물인 경우,
    if (findBoard.length) {
      return {
        data: findBoard,
        status: 409,
        message: 'already saved, please use update function API',
      };
    }

    const writeBoard = await this.boardRepository.save({
      user_id: id,
      rating: dto.rating,
      best: false,
      isDeleted: false,
      house_info_id: chosenShopId,
      reviews: dto.reviews,
    });

    for (let i = 0; i < dto.hashtag.length; i++) {
      await this.hashtagRepository.save({
        write_board_id: writeBoard.id,
        tag: dto.hashtag[i],
      });
    }

    for (let i = 0; i < dto.img.length; i++) {
      await this.uploadImageRepository.save({
        foodImage: dto.img[i],
        write_board_id: writeBoard.id,
        house_info_id: chosenShopId,
      });
    }

    //! bookmark에 등록된 경우 삭제하기 (가보고싶어요 -> 먹어봤어요 변경? 안함)
    // 작성해야함

    // aveRating 계산해서 설정하기
    // 평균값 = 평점의 합 / 해당 shopInfo로 등록한 writeBoard의 수

    const allWriteBoardData = await this.boardRepository.findAndCount({
      house_info_id: chosenShopId,
    });

    // find를 먼저 하고, 마지막에 count값을 배열로 가져옴

    // 분모와 분자값을 설정하여 평균값 계산하기
    const numberator: number = allWriteBoardData[0].reduce(
      (acc, cur) => acc + cur.rating,
      0,
    );
    const denominator: number = allWriteBoardData[1];

    const averageRating = numberator / denominator;

    await this.shopInfoRepository.update(
      { id: chosenShopId },
      { aveRating: averageRating },
    );

    return {
      data: {
        // 평점을 소수점 첫번째 자리 까지만 나타내기
        aveRating: Math.round(averageRating * 10) / 10,
        feed: {
          feedId: writeBoard.id,
          title: dto.title,
          Hashtag: dto.hashtag,
          location: dto.location,
          img: dto.img,
          rating: dto.rating,
          reviews: dto.reviews,
        },
        status: 200,
      },
    };
  }

  async delete(id: number) {
    const existBoard = await this.boardRepository.find({
      id: id,
    });

    if (existBoard.length === 0) {
      throw new UnauthorizedException({
        message: 'Not found board',
        status: 401,
      });
    }

    await this.boardRepository.update(
      {
        isDeleted: false,
        id: id,
      },
      { isDeleted: true },
    );
    await this.hashtagRepository.delete({
      write_board_id: id,
    });
    await this.uploadImageRepository.delete({
      write_board_id: id,
    });

    return {
      data: {
        feedId: id,
      },
      status: 200,
    };
  }
}
