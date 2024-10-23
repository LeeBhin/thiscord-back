import { Injectable, Inject, OnApplicationShutdown } from '@nestjs/common';
import { NEO4J_CONNECTION } from './neo4j.constants';
import { Connection } from 'cypher-query-builder';

@Injectable()
export class QueryRepository {
  constructor(
    @Inject(NEO4J_CONNECTION)
    private readonly connection: Connection,
  ) { }

  async createHelloWorldNode() {
    const query = this.connection.query().raw(`
      CREATE (n:Greeting {message: 'hello world'})
      RETURN n
    `);

    return await query.run();
  }

  onApplicationShutdown() {
    this.connection.close();
  }
}
