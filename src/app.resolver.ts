import { Resolver, Query, Mutation } from '@nestjs/graphql';
import { QueryRepository } from './neo4j/noe4j.service';

@Resolver()
export class AppResolver {
  constructor(private readonly queryRepository: QueryRepository) { }

  @Query(() => String)
  async helloWorld() {
    return 'hello world';
  }

  @Mutation(() => String)
  async createGreeting() {
    const result = await this.queryRepository.createHelloWorldNode();
    return `Created node with message: ${JSON.stringify(result)}`;
  }
}
