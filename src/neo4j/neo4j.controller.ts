import { Controller, Get } from '@nestjs/common';
import { Neo4jService } from './noe4j.service';

@Controller('neo4j')
export class Neo4jController {
    constructor(private readonly neo4jService: Neo4jService) { }

    @Get()
    getHello(): string {
        return 'neo4j';
    }

    @Get('test')
    async getData() {
        const query = 'MATCH (n) RETURN n LIMIT 10';
        const result = await this.neo4jService.runQuery(query);
        return result;
    }
}
