import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm/index';
import { Hashtag } from './Hashtag.entity';
import { Shop_Info } from './Shop_Info.entity';
import { Upload_Image } from './Upload_Image.entity';
import { Users } from './Users.entity';

@Entity()
export class Write_Board {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  house_info_id: number;

  @Column()
  rating: number;

  @Column({ default: false })
  best: boolean;

  @Column({ nullable: true })
  reviews: string;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Shop_Info)
  @JoinColumn({
    name: 'house_info_id',
    referencedColumnName: 'id',
  })
  shopInfo: Shop_Info;

  @ManyToOne(() => Users)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user: Users;

  @OneToMany(() => Hashtag, (hashtag) => hashtag.writeBoard)
  hashtag: Hashtag[];

  @OneToMany(() => Upload_Image, (uploadImage) => uploadImage.writeBoard)
  img: Upload_Image[];

  feedId?: number;
  title?: string;
  location?: string;
}
