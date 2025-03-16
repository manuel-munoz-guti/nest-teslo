import { Injectable } from '@nestjs/common';
import { ProductsService } from './../products/products.service';
import { initialData } from './data/seed-data';

@Injectable()
export class SeedService {
  constructor(private readonly productsService: ProductsService) {}

  async runSeed() {
    try {
      await this.insertNewProducts();
    } catch (error) {
      return `Seed failed: ${error}`;
    }
    return `Seed executed`;
  }

  private async insertNewProducts() {
    await this.productsService.deleteAllProducts();
    const products = initialData.products;
    const insertPromises = products.map((product) =>
      this.productsService.create(product),
    );
    await Promise.all(insertPromises);

    return true;
  }
}
