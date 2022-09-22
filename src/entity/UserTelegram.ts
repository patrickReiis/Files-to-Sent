import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { UserAccount } from './UserAccount';

@Entity()
export class UserTelegram {

	@PrimaryGeneratedColumn()
	tableId:number;

	@Column('bigint', { unique: true } )
	telegramId: number;
	
	@Column('varchar', { unique: true, nullable:true } ) // Username may not be avaiable for some reason.  
	username: string;

	@Column('varchar', { length: 255 })
	first_name: string;

	@ManyToOne(() => UserAccount, (user) => user.telegramUsers, { onDelete: 'CASCADE'})
	owner: UserAccount;

}
