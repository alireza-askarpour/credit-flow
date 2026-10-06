import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { CreditUserDto } from './dto/credit-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.users.create(dto);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.users.findById(id);
  }

  @Post(':id/credit')
  credit(
    @Param('id') id: string,
    @Body() dto: CreditUserDto,
  ): Promise<UserResponseDto> {
    return this.users.credit(id, dto);
  }
}
