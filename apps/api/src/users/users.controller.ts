import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { CreditUserDto } from './dto/credit-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user account' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.users.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details and balance' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  findById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.users.findById(id);
  }

  @Post(':id/credit')
  @ApiOperation({ summary: 'Add credit to a user balance' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  credit(
    @Param('id') id: string,
    @Body() dto: CreditUserDto,
  ): Promise<UserResponseDto> {
    return this.users.credit(id, dto);
  }
}
