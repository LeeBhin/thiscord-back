// neo4j.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Driver } from 'neo4j-driver';

@Injectable()
export class Neo4jService {
  constructor(@Inject('NEO4J_DRIVER') private readonly driver: Driver) {}

  async runQuery(query: string) {
    const session = this.driver.session();
    try {
      const result = await session.run(query);
      return result.records.map(record => record.get(0));
    } finally {
      await session.close();
    }
  }
}
