import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Board')
@Controller('api/board')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @UseGuards(JwtAuthGuard)
  @Post('write/:id')
  @ApiOperation({
    summary: '게시물 등록 API',
    description: '게시물 등록',
  })
  @ApiBody({ type: CreateBoardDto })
  @ApiParam({ name: 'id' })
  create(@Param('id') id: number, @Body() dto: CreateBoardDto) {
    return this.boardService.create(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:id')
  @ApiOperation({
    summary: '게시물 삭제 API',
    description: '게시물 삭제',
  })
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: number) {
    return this.boardService.delete(id);
  }
}
