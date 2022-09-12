import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class UserAccount {
	
	@PrimaryGeneratedColumn()
	id:number

	@Column('varchar', { length: 255 })
	username:string

	@Column('varchar', { length: 100, unique: true })
	email:string

	@Column('varchar', { length: 255 })
	password:string

	@Column('boolean', { default: false })
	isActive:boolean

	@Column('varchar', { length: 20, nullable:true })
	uniqueString:string|null // used to activate the account
	
	@Column('varchar', { length: 64, default: null, unique:true})
	sessionId:string|null

	@Column('timestamp', {nullable:true})
	cookieExpires: Date|null;

}
