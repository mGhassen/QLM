# Extensions Local Test Stack

This stack brings up local services to test datasource extensions end-to-end:

- PostgreSQL
- MySQL
- MongoDB
- ClickHouse
- MinIO (S3-compatible object storage)
- Local HTTP-hosted CSV, JSON, and Parquet files

## Start

From the repository root:

```bash
docker compose -f docker/extensions/docker-compose.extensions.yml up -d
```

The one-shot seed services will:

- generate `extensions.csv`, `extensions.json`, and `extensions.parquet`
- expose those files via HTTP on `http://localhost:18080`
- upload those files to MinIO bucket `extensions-files`

## Stop

```bash
docker compose -f docker/extensions/docker-compose.extensions.yml down -v
```

## Connection Details

### PostgreSQL

- Host: `localhost`
- Port: `55432`
- Database: `extensions`
- User: `qlm`
- Password: `qlm`
- URL: `postgresql://qlm:qlm@localhost:55432/extensions`

### MySQL

- Host: `localhost`
- Port: `53306`
- Database: `extensions`
- User: `qlm`
- Password: `qlm`
- URL: `mysql://qlm:qlm@localhost:53306/extensions`

### MongoDB

- Host: `localhost`
- Port: `57017`
- Database: `extensions`
- User: `root`
- Password: `root`
- URL: `mongodb://root:root@localhost:57017/extensions?authSource=admin`

### ClickHouse

- HTTP Host: `localhost`
- HTTP Port: `18123`
- Native Port: `19090`
- Database: `extensions`
- User: `qlm`
- Password: `qlm`
- URL: `http://qlm:qlm@localhost:18123/extensions`

### MinIO (S3)

- Endpoint: `http://localhost:19000`
- Console: `http://localhost:19001`
- Access Key: `minio`
- Secret Key: `minio123`
- Region: `us-east-1`
- Bucket: `extensions-files`
- Sample object URLs:
  - `s3://extensions-files/extensions.csv`
  - `s3://extensions-files/extensions.json`
  - `s3://extensions-files/extensions.parquet`

### Online Files (for csv/json/parquet-online)

- CSV: `http://localhost:18080/extensions.csv`
- JSON: `http://localhost:18080/extensions.json`
- Parquet: `http://localhost:18080/extensions.parquet`
