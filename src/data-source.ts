import { DataSource } from 'typeorm';
import { UserAccount } from './entity/UserAccount';

export const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "winlectro",
    password: "EZFORCOiseverything",
    database: "filestosent",
    synchronize: true,
    logging: false,
    entities: [UserAccount],
    subscribers: [],
    migrations: [],
})
