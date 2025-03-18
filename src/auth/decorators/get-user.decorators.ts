import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from '../entities/user.entity';

export const GetUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user?: User }>();
    const user = req.user as User;

    if (!user) {
      throw new InternalServerErrorException('User not found in request');
    }

    return !data ? user : (user[data as keyof User] ?? null);
  },
);
