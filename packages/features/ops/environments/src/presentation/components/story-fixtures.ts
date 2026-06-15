import type { Service } from "./service-card";

export const storyPostgresService: Service = {
  id: "svc-story-pg",
  name: "postgres-primary",
  type: "postgres",
  status: "online",
  environmentName: "Production",
  databaseProviderName: "Neon",
  databaseProviderLogoUrl: "https://cdn.simpleicons.org/neon/00e5bf",
  databaseVersion: "16.4",
  nodeName: "db-prd-use1a-01",
  nodeCloudProviderLogoUrl: "https://cdn.simpleicons.org/amazonaws/ff9900",
};

export const storyRedisService: Service = {
  id: "svc-story-rd",
  name: "redis-cache",
  type: "redis",
  status: "online",
};
