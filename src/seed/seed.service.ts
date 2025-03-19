import { Injectable } from '@nestjs/common';
import { ProductsService } from './../products/products.service';
import { initialData } from './data/seed-data';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SeedService {
  constructor(
    private readonly productsService: ProductsService, // Inyectamos el servicio para acceder al deleteAllProducts
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async runSeed() {
    try {
      await this.deleteTables();
      const firstUser = await this.insertUsers();
      await this.insertNewProducts(firstUser);
    } catch (error) {
      return `Seed failed: ${error}`;
    }
    return `Seed executed`;
  }

  private async deleteTables() {
    await this.productsService.deleteAllProducts();
    const queryBuilder = this.userRepository.createQueryBuilder();
    await queryBuilder.delete().where({}).execute();
  }

  private async insertUsers() {
    const seedUser = initialData.users;
    const users: User[] = [];

    seedUser.forEach((user) => {
      users.push(this.userRepository.create(user));
    });

    const dbUsers = await this.userRepository.save(users);
    return dbUsers[0];
  }

  private async insertNewProducts(user: User) {
    await this.productsService.deleteAllProducts();
    const products = initialData.products;
    const insertPromises = products.map((product) =>
      this.productsService.create(product, user),
    );
    await Promise.all(insertPromises);

    return true;
  }
}
