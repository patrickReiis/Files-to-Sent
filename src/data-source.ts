import { DataSource } from 'typeorm';
import { UserAccount } from './entity/UserAccount';
import { UserTelegram } from './entity/UserTelegram';

export const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: "filestosent",
    synchronize: true,
    logging: false,
    entities: [UserAccount, UserTelegram],
    subscribers: [],
    migrations: [],
})
