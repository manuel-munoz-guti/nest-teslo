import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsPositive()
  @Type(() => Number) // con esta linea transformamos el string que llega de la query a numero
  limit?: number;

  @IsOptional()
  @Min(0)
  @Type(() => Number) // con esta linea transformamos el string que llega de la query a numero
  offset?: number;
}
