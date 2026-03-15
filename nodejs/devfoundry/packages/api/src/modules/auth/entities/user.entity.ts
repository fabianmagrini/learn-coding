import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** Platform user roles. `admin` can manage policies; `developer` can trigger agents; `viewer` is read-only. */
export type UserRole = 'admin' | 'developer' | 'viewer';

/** Registered platform user. Passwords are stored as bcrypt hashes — never in plaintext. */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ default: 'developer' })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
