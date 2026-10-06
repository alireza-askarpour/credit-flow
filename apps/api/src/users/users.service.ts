import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UserRepository } from '@app/prisma';
import { CreateUserDto } from './dto/create-user.dto';
import { CreditUserDto } from './dto/credit-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly users: UserRepository) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    if (
      dto.initialBalance !== undefined &&
      !Number.isSafeInteger(dto.initialBalance)
    ) {
      throw new BadRequestException('Initial balance must be a safe integer');
    }
    const initialBalance = dto.initialBalance
      ? BigInt(dto.initialBalance)
      : 0n;
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      balance: initialBalance,
    });

    return this.toResponse(user);
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(user);
  }

  async credit(id: string, dto: CreditUserDto): Promise<UserResponseDto> {
    if (!Number.isSafeInteger(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException('Amount must be a positive integer');
    }

    const existingUser = await this.users.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const user = await this.users.creditWithTransaction(
      id,
      BigInt(dto.amount),
      `credit:${randomUUID()}`,
    );

    return this.toResponse(user);
  }

  private toResponse(user: {
    id: string;
    name: string;
    email: string;
    balance: bigint;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance.toString(),
      version: user.version,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
