import {
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, createQueryBuilder, Like, ILike, In } from 'typeorm';
import { CreateSearchDto } from './dto/create-search.dto';
import { UpdateSearchDto } from './dto/update-search.dto';
import { Users } from '../entities/Users.entity';
import { Friend_List } from '../entities/Friend_List.entity';
import { Write_Board } from '../entities/Write_Board.entity';
import { Bookmark } from '../entities/Bookmark.entity';
import { Hashtag } from '../entities/Hashtag.entity';
import { Upload_Image } from '../entities/Upload_Image.entity';
import { NotFoundError } from 'rxjs';
import { Shop_Info } from '../entities/Shop_Info.entity';
import {
  Client,
  Language,
  PlaceType1,
  AddressType,
} from '@googlemaps/google-maps-services-js';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { BookmarkType } from './bookmark.type';
const qs = require('query-string');

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(Friend_List)
    private readonly friendListRepository: Repository<Friend_List>,
    @InjectRepository(Write_Board)
    private readonly writeBoardRepository: Repository<Write_Board>,
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(Hashtag)
    private readonly hashtagRepository: Repository<Hashtag>,
    @InjectRepository(Shop_Info)
    private readonly shopInfoRepository: Repository<Shop_Info>,
    @InjectRepository(Upload_Image)
    private readonly uploadImageRepository: Repository<Upload_Image>,
  ) {}

  create(createSearchDto: CreateSearchDto) {
    return 'This action adds a new search';
  }

  async mainPage(id: number) {
    // usersRepository의 id === friendListRepository의 user_id 인 경우,
    // friendListRepository의 friend === usersRepository의 id인 경우,
    // WriteBoardRepository의 정보와 ShopInfoRepository 등등을 가져와야함

    // Friend - user id,
    //          name,
    //          profileImage,
    // uploadImage - foodImage,
    // shopInfo - location,
    //            title,
    // Hashtag - tag,
    // WriteBoard - reviews,
    //              rating,
    //              created_at
    const userData = await this.usersRepository.find({ id: id });

    if (userData.length === 0)
      throw new NotFoundException({
        message: 'There is no Friend',
        status: 404,
      });

    // 1. user의 friendsList를 바탕으로 해당 friend의 Id를 가져온다.
    const friendsListData = await this.friendListRepository.find({
      user_id: id,
    });
    // 친구가 없는 애는 status : 200, isData = false
    // 가입하지 않은 유저는 에러
    let isData = true;
    if (friendsListData.length === 0) {
      isData = false;
      return { data: null, status: 200, isData: isData };
    }

    const friendList = friendsListData.map((el) => el.friend);
    // 2. friendList를 user table의 id에 대입하여 user id, name, profileImage를 가져온다.

    const allData = await this.writeBoardRepository
      .createQueryBuilder('writeBoard')
      .leftJoin('writeBoard.user', 'user')
      .leftJoin('writeBoard.hashtag', 'hashtag')
      .leftJoin('writeBoard.shopInfo', 'shopInfo')
      .leftJoin('writeBoard.img', 'img')
      .select([
        'user.id',
        'user.name',
        'user.nickname',
        'user.profileImage',
        'user.foodType',
        'user.foodStyle',
        'shopInfo.id',
        'shopInfo.title',
        'shopInfo.location',
        'shopInfo.aveRating',
        'shopInfo.foodCategory',
        'shopInfo.menu',
        // upload_Image - foodImage
        'img.foodImage',
        'img.created_at',
        'writeBoard.rating',
        'writeBoard.reviews',
        'hashtag.tag',
        'writeBoard.created_at',
      ])
      .where('writeBoard.user_id IN (:id)', { id: friendList })
      .getMany();

    console.log('allData', allData);

    // let aveRating: number;
    // 같은 가게에 친구들의 평점 대한 평균값을 구해야 한다.
    // 1. 가게는 shopId로 구분하여 평점을 더해주고, 해당되는 shopId를 가진 게시물에 넣어줘야 한다.
    // 1-1. 첫 번째 객체의 shopId와 동일한 객체를 구해준다.
    // 1-2. 동일한 객체들의 평점을 더하고 합을 구해서 그것들의 length로 나눠준 다음 그들의 aveRating에 넣어준다.
    // let shopIdArr = [];
    // let shopAveRatingData = [];
    // allData.forEach((el) => {
    //   if (!shopIdArr.includes(el.shopInfo.id)) {
    //     shopIdArr.push(el.shopInfo.id)
    //   }
    // });
    // shopIdArr.sort((a, b) => a - b);
    // for (let shopId of shopIdArr) {
    //   let friendWriteBoard = {};
    //   friendWriteBoard[shopId] = [];
    // }
    // for (let shopId of shopIdArr) {
    //   let sum = [];
    //   let count = 0;
    //   allData.forEach((el, idx) => {
    //     if (shopId === el.shopInfo.id) {
    //       sum.push(el.rating);
    //       count++;
    //     }
    //     if (idx === allData.length - 1) {
    //       shopAveRatingData.push({
    //         shopId,
    //         aveRating: sum.reduce((acc, cur) => acc + cur) / count,
    //       });
    //       sum = [];
    //       count = 0;
    //     }
    //   });
    // }

    let friendWriteBoard = {};
    allData.forEach((el) => {
      friendWriteBoard[el.shopInfo.id] = [];
    });
    console.log(friendWriteBoard);

    for (let key in friendWriteBoard) {
      allData.forEach((el) => {
        if (Number(key) === el.shopInfo.id) {
          friendWriteBoard[key].push({
            userId: el.user.id,
            name: el.user.name,
            nickname: el.user.nickname,
            foodType: el.user.foodType,
            foodStyle: el.user.foodStyle,
            profileImg: el.user.profileImage,
            hashtag: el.hashtag.map((hashtagEl) => hashtagEl.tag),
            relatedImg: el.img.map((el) => {
              return {
                img: el.foodImage,
                created_at: el.created_at,
              };
            }),
            rating: el.rating,
            reviews: el.reviews,
          });
        }
      });
    }
    const refinedData = allData.map((el, idx) => {
      // 앞에서 구한 aveRating을 적용시켜준다.
      // for (let aveData of shopAveRatingData) {
      //   if (el.shopInfo.id === aveData.shopId) {
      //     el.shopInfo.aveRating = aveData.aveRating;
      //   }
      // }
      let friends = friendWriteBoard[el.shopInfo.id].filter(
        (user) => user.userId !== el.user.id,
      );
      console.log(friends);
      return {
        title: el.shopInfo.title,
        relatedImg: el.img.map((el) => {
          return {
            img: el.foodImage,
            created_at: el.created_at,
          };
        }),
        foodCategory: el.shopInfo.foodCategory,
        location: el.shopInfo.location,
        userId: el.user.id,
        name: el.user.name,
        foodType: el.user.foodType,
        foodStyle: el.user.foodStyle,
        nickname: el.user.nickname,
        // 배열 내 객체 형태, hashtag: el.hashtag,
        hashtag: el.hashtag.map((hashtagEl) => hashtagEl.tag),
        rating: el.rating,
        profileImg: el.user.profileImage,
        reviews: el.reviews,
        created_at: el.created_at,
        menu: el.shopInfo.menu,
        // aveRating: Math.round(el.shopInfo.aveRating * 10) / 10,
        friends: friends,
      };
    });

    return { data: refinedData, status: 200, isData: isData };
  }

  async findResult(id: number, query: string) {
    if (query === '')
      throw new NotFoundException({
        message: '검색어를 입력해주세요',
        status: 404,
      });
    const client = new Client({});
    let isUserData = true;
    let isShopData = true;
    // 입력 받은 query문으로 google api 검색하기
    // 검색은 구글신이 자동으로 우리의 위치를 파악해서 반경 5KM이내의 결과값만 가져다 줌 + 한국 전화번호 제외하고 대부분 정보 포함한 것으로 확인됨.
    // ! textSearch로 가져온 정보를 수정해서 search 결과에 담는다.
    // ! 해당 정보와 title이 일치하는 것이 있을 경우, 그 데이터와 연관된 정보를 가져온다.
    const textSearch = await client.textSearch({
      params: {
        query: query,
        language: 'ko' as Language,
        key: process.env.API_KEY,
      },
      timeout: 1000,
    });
    // shopNameList에 포함된 title 중 DB title이 일치하는 경우
    // shopInfoGoogleAPI에서 제외시켜야함.
    const textSearchShopInfoGoogleAPI = textSearch.data.results;
    console.log(textSearchShopInfoGoogleAPI);
    const shopInfoGoogleAPI = textSearchShopInfoGoogleAPI.map((result) => {
      // console.log(result.name, result.types.includes('food' as AddressType));
      if (result.photos === undefined) {
        result.photos = [
          {
            photo_reference: null,
            height: 640,
            width: 400,
            html_attributions: [],
          },
        ];
      }
      return {
        isDB: false,
        title: result.name,
        mainImg: result.photos[0].photo_reference,
        foodCategory: result.types,
        location: result.formatted_address,
        relatedImg: result.photos,
        aveRating: null,
        priceLevel: result.price_level,
        menu: null,
        friends: null,
      };
    });
    // console.log(shopInfoGoogleAPI);

    //! Google Api Detail ver.
    /* 전화번호 등 정보를 가져오기 위해서 Detail 필요, 없는 정보는 알아서 제외됨
    const placeIdList = [];
    const addCheck = [];
    for (let searchData of textSearch.data.results) {
      for (let PID in searchData) {
        if (PID === 'place_id') {
          placeIdList.push(searchData[PID]);
          // console.log("PID: ", PID, searchData[PID])
        } else if (PID === 'formatted_address') {
          addCheck.push(searchData[PID]);
        }
      }
    }
    const placeId = textSearch.data.results[0].place_id;
    console.log(placeIdList, addCheck, textSearch.data.results[0]);

    const placeDetails = await client.placeDetails({
      params: {
        place_id: placeId,
        fields: [
          'formatted_phone_number',
          'formatted_address',
          'name',
          'opening_hours',
          'photos',
          'price_level',
          'rating',
          'types',
          'url',
          'vicinity',
        ],
        language: 'ko' as Language,
        key: process.env.API_KEY,
      },
      timeout: 1000,
    });
    console.log('placeDetails.data', placeDetails.data);
    return ; */

    // ! nickName으로 검색된 유저 정보 가져오기
    // 1. query와 일치하는 nickName을 가진 user 정보를 가져온다.

    // 1) nickName이 query와 일치하는 경우
    // const nickNameUserData = await this.usersRepository.find({nickname: query})

    // 2) nickName이 query가 포함된 경우

    const nickNameUserData = await this.usersRepository.find({
      nickname: Like(`%${query}%`),
    });

    if (nickNameUserData.length === 0) isUserData = false;

    // const nickNameUserData2 = await this.usersRepository.find({nickname: ILike(`%${query}%`)})

    // 3) nickName이 query로 시작하는 경우
    // const nickNameUserData = await this.usersRepository.find({nickname: Like(`%${query}`)})

    // 2. 검색된 user의 board 개수를 체크해서 완성된 데이터에 포함시켜준다.
    const idList = nickNameUserData.map((el) => el.id);
    const countList = [];
    const noReviewList = [];

    for (let searchedId of idList) {
      const countData = await this.writeBoardRepository.count({
        user_id: searchedId,
      });
      countList.push(countData);
      const reviewsData = await this.writeBoardRepository.count({
        user_id: searchedId,
        reviews: null,
      });
      noReviewList.push(reviewsData);
    }

    console.log(countList, noReviewList);
    // 3. 검색된 user의 reviews 개수를 체크해서 데이터에 포함시켜줘야한다.
    // reviews가 null인 값을 빼준다.

    const nickNameUserList = nickNameUserData.map((user, idx) => {
      return {
        userId: user.id,
        name: user.name,
        nickName: user.nickname,
        profileImg: user.profileImage,
        foodType: user.foodType,
        foodStyle: user.foodStyle,
        boardCount: countList[idx],
        reviewsCount: countList[idx] - noReviewList[idx],
      };
    });

    // ! shop정보 및 관련된 friends 정보 가져오기
    // 1. query가 포힘된 shop title의 shop과 관련된 정보를 가져온다.
    const allData = await this.shopInfoRepository
      .createQueryBuilder('shopInfo')
      .leftJoin('shopInfo.writeBoard', 'writeBoard')
      .leftJoin('writeBoard.img', 'img')
      .leftJoin('writeBoard.hashtag', 'hashtag')
      .leftJoin('writeBoard.user', 'user')
      .select([
        'shopInfo.title',
        'shopInfo.mainImage',
        'shopInfo.foodCategory',
        'shopInfo.location',
        'img.foodImage',
        'img.created_at',
        'shopInfo.id',
        'shopInfo.aveRating',
        'shopInfo.menu',
        'user.id',
        'user.name',
        'user.nickName',
        'user.profileImage',
        'writeBoard.rating',
        'writeBoard.reviews',
        'hashtag.tag',
      ])
      .where(`shopInfo.title LIKE :title`, { title: `%${query}%` })
      .getMany();

    if (allData.length === 0 && textSearchShopInfoGoogleAPI.length === 0) {
      isShopData = false;
    }

    // 2.1. shop관련 정보를 API에 맞게 변경한다.
    // 2.2. user의 id를 기반으로 친구 정보를 가져와서 친구가 작성한 게시물만 저장한다.
    const friendsListData = await this.friendListRepository.find({
      user_id: id,
    });
    const friendList = friendsListData.map((el) => el.friend);

    const DBshopNameList = [];

    const shopInfoList = allData.map((el) => {
      let aveRating: number;
      DBshopNameList.push(el.title);
      const filteredWB = el.writeBoard.filter((wbEl, idx) => {
        return friendList.includes(wbEl.user.id);
      });
      aveRating =
        filteredWB.reduce((acc, cur) => acc + cur.rating, 0) /
        filteredWB.length;
      return {
        isDB: true,
        shopId: el.id,
        title: el.title,
        mainImg: el.mainImage,
        foodCategory: el.foodCategory,
        location: el.location,
        aveRating: Math.round(aveRating * 10) / 10,
        menu: el.menu,
        friends: filteredWB.map((fWBEl) => {
          return {
            userId: fWBEl.user.id,
            name: fWBEl.user.name,
            nickname: fWBEl.user.nickname,
            profileImg: fWBEl.user.profileImage,
            relatedImg: fWBEl.img.map((imgEl) => {
              return { img: imgEl.foodImage, created_at: imgEl.created_at };
            }),
            rating: fWBEl.rating,
            reviews: fWBEl.reviews,
            hashtag: fWBEl.hashtag.map((hashtagEl) => hashtagEl.tag),
          };
        }),
      };
    });

    // DB에 저장이 되어있지 않고, 가게 종류가 food type인 것만 포함
    const conflictAndFoodCheckShopInfoGoogleAPI = shopInfoGoogleAPI.filter(
      (el) => {
        return (
          !DBshopNameList.includes(el.title) &&
          el.foodCategory.includes('food' as AddressType)
        );
      },
    );

    const shopInfo = [
      ...shopInfoList,
      ...conflictAndFoodCheckShopInfoGoogleAPI,
    ];
    if (shopInfo.length === 0) {
      isShopData = false;
    }

    //! userData와 shopData가 모두 없을 경우
    if (!isUserData && !isShopData)
      throw new NotFoundException({
        message: `No Matching Results`,
        status: 404,
      });

    return {
      data: { user: nickNameUserList, shopInfo: shopInfo },
      status: 200,
      isUserData,
      isShopData,
    };
  }

  async findFriend(id: number, query: string) {
    if (query === '')
      throw new UnauthorizedException({
        message: 'Please Input Query',
        status: 401,
      });
    // 이름/닉네임/연락처로 친구만 검색

    // 1. 입력된 id를 바탕으로 친구를 검색
    const friendsListData = await this.friendListRepository.find({
      user_id: id,
    });

    // 2. 입력된 query를 바탕으로 해당되는 유저를 검색
    const queryListData = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.id')
      .where(`user.name LIKE :name`, { name: `%${query}%` })
      .orWhere(`user.nickname LIKE :nickname`, { nickname: `%${query}%` })
      .orWhere(`user.phoneNumber LIKE :phoneNumber`, {
        phoneNumber: `%${query}%`,
      })
      .getMany();
    const queryList = queryListData.map((el) => el.id);
    const friendList = friendsListData.map((el) => el.friend);

    // 3. 친구와 검색된 유저가 일치하는 user.id만 배열에 담음
    const correctList = queryList.filter((queryEl) => {
      let trueOrFalse = false;
      friendList.forEach((friendEl) => {
        if (queryEl === friendEl) trueOrFalse = true;
      });
      return trueOrFalse;
    });

    if (correctList.length === 0)
      throw new NotFoundException({
        message: 'No Matching Results',
        status: 404,
      });

    // 4. 친구이면서 query로 검색된 유저정보를 정리
    const friendData = await this.usersRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.nickname', 'user.profileImage'])
      .where(`user.id IN (:id)`, {
        id: correctList,
      })
      .getMany();

    return {
      data: friendData,
      status: 200,
    };
  }

  async bookmark(
    type: BookmarkType['wantOrBest'],
    id: number,
    body: CreateBookmarkDto,
  ) {
    let Delete: number = 0;
    let Insert: number = 0;
    // want인 경우 bookmark에 등록
    if (type === 'want') {
      // shopid를 필요로 함 = board 로직과 동일하게 구성해야함

      const existTitle = await this.shopInfoRepository.find({
        id: body.shopId,
      });

      let chosenShopId: number;

      if (existTitle.length === 0) {
        const newShopInfo = await this.shopInfoRepository.save({
          mainImage: body.mainImage,
          foodCategory: body.foodCategory,
          menu: body.menu,
          contact: body.contact,
          title: body.title,
          location: body.location,
        });
        chosenShopId = newShopInfo.id;
      } else if (existTitle.length) chosenShopId = existTitle[0].id;

      const findBookmark = await this.bookmarkRepository.find({
        user_id: id,
        house_info_id: chosenShopId,
      });

      // 이미 등록이 되어 있는 경우에는 삭제하기
      if (findBookmark.length) {
        Delete++;
        await this.bookmarkRepository.delete({
          user_id: id,
          house_info_id: chosenShopId,
        });
      } else if (!findBookmark.length) {
        Insert++;
        await this.bookmarkRepository
          .createQueryBuilder('bookmark')
          .insert()
          .into(Bookmark)
          .values({ user_id: id, house_info_id: chosenShopId })
          .orIgnore()
          .updateEntity(false)
          .execute();
      }
    }
    // best인 경우 feedId를 가지는 writeBoard의 best 값을 true로 변경
    else if (type === 'best') {
      if (typeof body.feedId !== 'object') {
        return { data: null, status: 422, message: 'wrong body type' };
      }
      body.feedId.forEach(async (feed) => {
        const findBest = await this.writeBoardRepository.find({
          id: feed,
        });
        if (findBest[0].best) {
          Delete++;
          await this.writeBoardRepository.update(feed, { best: false });
        } else if (!findBest[0].best) {
          Insert++;
          await this.writeBoardRepository.update(feed, { best: true });
        }
      });
    }
    // 세가지 버전의 숫자를 리턴하기
    // 1. 방문한 가게의 수(등록한 게시물의 수와 동일 = 한 가게당 유저의 게시물은 하나만 가능)
    // 2. 가고싶어요 표시한 가게의 수(북마크 등록한 가게의 수 - )
    // 3. best 등록한 feed의 가게 수
    const visitCount = await this.writeBoardRepository.count({
      user_id: id,
    });
    const wantCount = await this.bookmarkRepository.count({
      user_id: id,
    });
    const bestCount = await this.writeBoardRepository.count({
      user_id: id,
      best: true,
    });

    return {
      data: {
        visit: visitCount,
        want: wantCount,
        best: bestCount,
      },
      type: type,
      delete: Delete,
      insert: Insert,
      status: 200,
    };
  }

  update(id: number, updateSearchDto: UpdateSearchDto) {
    return `This action updates a #${id} search`;
  }

  remove(id: number) {
    return `This action removes a #${id} search`;
  }
}
