# Staging deployment

This deployment is for demo/staging with synthetic data only. Do not load real
patient data into the Oracle Free environment.

## Required files on the VPS

Copy these examples without the `.example` suffix and fill them with secrets:

- `deploy/.env`
- `deploy/backend.staging.env`
- `deploy/ai-service.staging.env`
- `deploy/office-service.staging.env`
- `deploy/python-ml.staging.env`

Keep these files outside Git. Set `DOMAIN` to the real DNS name and
`IMAGE_PREFIX` to the GitHub Container Registry namespace.

## First deployment

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin ufw
sudo usermod -aG docker "$USER"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

mkdir -p ~/phongkham/deploy
cd ~/phongkham
docker login ghcr.io
docker compose --env-file deploy/.env -f deploy/docker-compose.staging.yml pull
docker compose --env-file deploy/.env -f deploy/docker-compose.staging.yml up -d
docker compose --env-file deploy/.env -f deploy/docker-compose.staging.yml ps
```

Point the domain DNS A record to the VPS before the first start. Caddy obtains
and renews the HTTPS certificate automatically.

The database schema is imported automatically only when the MySQL volume is
created for the first time. Later schema changes require a reviewed SQL
migration and a database backup before deployment.

## Backup and rollback

```bash
mkdir -p ~/phongkham/backups
docker compose --env-file deploy/.env -f deploy/docker-compose.staging.yml exec -T mysql \
  sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction "$MYSQL_DATABASE"' \
  | gzip > "backups/phong_kham_$(date +%Y%m%d_%H%M%S).sql.gz"

docker compose --env-file deploy/.env -f deploy/docker-compose.staging.yml logs --tail=100 backend
```

To roll back, set `IMAGE_TAG` to the previous commit tag and run `pull` and
`up -d` again. Restore the database only when the deployment included a
backward-incompatible migration.

## Smoke checks

```bash
curl -fsS https://YOUR_DOMAIN/api/health
curl -fsS https://YOUR_DOMAIN/ > /dev/null
```
