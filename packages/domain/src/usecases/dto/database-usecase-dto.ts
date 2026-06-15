import { Exclude, Expose, plainToClass } from 'class-transformer';

import type {
  Database,
  DatabaseCompute,
  DatabaseStatus,
  DbRole,
  DeploymentType,
} from '../../entities';

@Exclude()
export class DatabaseOutput {
  @Expose() public id!: string;
  @Expose() public name!: string;
  @Expose() public accountId!: string;
  @Expose() public provider!: string;
  @Expose() public version!: string;
  @Expose() public status!: DatabaseStatus;
  @Expose() public deploymentType!: DeploymentType;
  @Expose() public fqdn!: string;
  @Expose() public port?: number;
  @Expose() public nodeId?: string | null;
  @Expose() public dbUserId?: string | null;
  @Expose() public compute?: DatabaseCompute;
  @Expose() public dbRole?: DbRole;
  @Expose() public createdAt!: string;
  @Expose() public updatedAt!: string;

  public static new(database: Database): DatabaseOutput {
    return plainToClass(DatabaseOutput, database);
  }
}

export type CreateDatabaseInput = {
  accountId: string;
  name: string;
  provider: string;
  version: string;
  fqdn: string;
  deploymentType?: DeploymentType;
  port?: number;
  nodeId?: string;
  dbUserId?: string;
};

export type UpdateDatabaseInput = {
  id: string;
  status?: DatabaseStatus;
  nodeId?: string | null;
  port?: number;
};

export type ListDatabasesInput = {
  accountId?: string;
  search?: string;
};
