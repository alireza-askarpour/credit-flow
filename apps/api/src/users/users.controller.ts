import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { CreditUserDto } from './dto/credit-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
import { ApiCreateUser } from './docs/create-user.swagger';
import { ApiGetUser } from './docs/get-user.swagger';
import { ApiCreditUser } from './docs/credit-user.swagger';

@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @ApiCreateUser()
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.users.create(dto);
  }

  @Get(':id')
  @ApiGetUser()
  findById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.users.findById(id);
  }

  @Post(':id/credit')
  @ApiCreditUser()
  credit(
    @Param('id') id: string,
    @Body() dto: CreditUserDto,
  ): Promise<UserResponseDto> {
    return this.users.credit(id, dto);
  }
}
