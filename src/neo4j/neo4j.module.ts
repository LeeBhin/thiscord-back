import { Module, Global } from '@nestjs/common';
import neo4j, { Driver } from 'neo4j-driver';

@Global()
@Module({
    providers: [
        {
            provide: 'NEO4J_DRIVER',
            useFactory: async (): Promise<Driver> => {
                console.log('Connecting to Neo4j at', process.env.NEO4J_URL);

                const driver = neo4j.driver(
                    process.env.NEO4J_URL,
                    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
                );
                await driver.getServerInfo();
                
                return driver;
            }

        },
    ],
    exports: ['NEO4J_DRIVER'],
})
export class Neo4jModule { }
