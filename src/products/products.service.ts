import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
import { Product, ProductImage } from './entities';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto, user: User) {
    try {
      const { images = [], ...productDetails } = createProductDto;

      const product = this.productRepository.create({
        ...productDetails,
        images: images.map((image) =>
          this.productImageRepository.create({ url: image }),
        ),
        user,
      });

      await this.productRepository.save(product);

      return { ...product, images };
    } catch (error) {
      this.handleDBException(error);
    }
  }

  async findAll(PaginationDto: PaginationDto) {
    try {
      const { limit = 10, offset = 0 } = PaginationDto;
      const products = await this.productRepository.find({
        take: limit,
        skip: offset,
        relations: {
          images: true,
        },
      });
      return products.map(({ images, ...rest }) => ({
        ...rest,
        images: images?.map((image) => image.url),
      }));
    } catch (error) {
      this.handleDBException(error);
    }
  }

  async findOne(term: string) {
    let product: Product | null;

    try {
      if (term && isUUID(term)) {
        product = await this.productRepository.findOneBy({ id: term });
      } else {
        const queryBuilder = this.productRepository.createQueryBuilder('prod'); //alias de la tabla producto en prod
        product = await queryBuilder
          .where('UPPER(title) =:title or slug =:slug', {
            title: term.toUpperCase(),
            slug: term.toLocaleLowerCase(),
          })
          .leftJoinAndSelect('prod.images', 'prodImages')
          .getOne();
      }

      if (!product) {
        throw new NotFoundException(`Product with id ${term} not found`);
      }
      return product;
    } catch (error) {
      this.handleDBException(error);
    }
  }

  async findOnePlain(term: string) {
    const product = await this.findOne(term);
    if (product) {
      const { images = [], ...rest } = product;
      return {
        ...rest,
        images: images.map((image: ProductImage) => image.url),
      };
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    const { images = [], ...dataToUpdate } = updateProductDto;
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      const product = await this.productRepository.preload({
        id,
        ...dataToUpdate,
      });

      if (!product) {
        throw new NotFoundException(`Product with id: ${id} not found`);
      }

      // Query Runner
      await queryRunner.connect(); // connecto to DB
      await queryRunner.startTransaction(); // start transaction

      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });
        product.images = images.map((image) =>
          this.productImageRepository.create({ url: image }),
        );
      }
      product.user = user;
      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction(); // commit transaction
      await queryRunner.release(); // release queryRunner

      return this.findOnePlain(id);
    } catch (error) {
      await queryRunner.rollbackTransaction(); // rollback transaction
      await queryRunner.release(); // release queryRunner

      this.handleDBException(error);
    }
  }

  async remove(id: string) {
    try {
      const product = await this.findOne(id);
      if (product) {
        await this.productRepository.remove(product);
      }
      return product;
    } catch (error) {
      this.handleDBException(error);
    }
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('prod');
    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleDBException(error);
    }
  }

  private handleDBException(error: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (error?.code === '23505') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new BadRequestException(error?.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error occurred, check server logs',
    );
  }
}
