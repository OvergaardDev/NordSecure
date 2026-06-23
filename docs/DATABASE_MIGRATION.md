# ----------------------------------------------------------------------------
# DATABASE MIGRATION GUIDE - SQLite to PostgreSQL
# ----------------------------------------------------------------------------

For production deployment, migrating from SQLite to PostgreSQL is REQUIRED.
SQLite is only suitable for development.

## Why PostgreSQL?

? Better concurrency handling (important for payment processing)
? ACID compliance and data integrity
? Connection pooling support
? Better for distributed systems
? Production-grade reliability
? Scales horizontally

## Migration Steps

### Step 1: Create PostgreSQL Database

Using AWS RDS:
1. Go to AWS RDS Console
2. Create Database ? PostgreSQL
3. Choose db.t3.micro (free tier) or db.t3.small (recommended)
4. Enable automated backups (30 days)
5. Make publicly accessible = true (for your IP only)
6. Get connection string

Using Supabase:
1. Go to https://supabase.com
2. Create new project
3. Copy connection string from Project Settings

Using self-hosted:
\\\ash
sudo -u postgres psql
CREATE DATABASE nordsecure;
CREATE USER nordsecure_user WITH PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE nordsecure TO nordsecure_user;
\\\

### Step 2: Update Environment Variables

\\\ash
# .env.production
DATABASE_URL=\"postgresql://nordsecure_user:password@host:5432/nordsecure\"

# Test connection
psql \ -c \"SELECT 1\"
\\\

### Step 3: Update Prisma Schema

Change src/prisma/schema.prisma:

OLD:
\\\prisma
datasource db {
  provider = \"sqlite\"
  url      = env(\"DATABASE_URL\")
}
\\\

NEW:
\\\prisma
datasource db {
  provider = \"postgresql\"
  url      = env(\"DATABASE_URL\")
}
\\\

### Step 4: Run Migrations

\\\ash
# Create new migration for schema changes
npx prisma migrate dev --name initial_postgres

# Deploy to production database
npx prisma migrate deploy

# Verify
npx prisma db push
\\\

### Step 5: Verify Data Integrity

\\\ash
# Check tables created
psql \ -c \"\\\\dt\"

# Check row counts
psql \ -c \"SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';\"

# Sample data check
psql \ -c \"SELECT COUNT(*) FROM products;\"
psql \ -c \"SELECT COUNT(*) FROM orders;\"
\\\

### Step 6: Test Application

\\\ash
# Test locally first
DATABASE_URL=\"postgresql://...\" npm run dev

# Test checkout flow
# Test admin panel
# Test payments
# Test emails

# If all works, deploy to production
\\\

## Troubleshooting

**\"ERROR: role 'nordsecure_user' does not exist\"**
? Run the CREATE USER command above

**\"SSL verification failed\"**
? Add ?sslmode=disable to connection string (not recommended for production)

**\"Too many connections\"**
? Upgrade database tier or configure connection pooling with PgBouncer

**\"Connection timeout\"**
? Check security group allows inbound on port 5432
? Verify DATABASE_URL is correct
? Check network connectivity

## Performance Tuning

After migration:

1. **Enable connection pooling** (for high traffic):
   \\\ash
   # Using PgBouncer
   apt-get install pgbouncer
   
   # Configure in /etc/pgbouncer/pgbouncer.ini
   \\\

2. **Create indexes on frequently queried columns**:
   \\\sql
   CREATE INDEX idx_orders_customer_email ON orders(customer_email);
   CREATE INDEX idx_orders_status ON orders(status);
   CREATE INDEX idx_reservations_payment_id ON reservations(payment_id);
   \\\

3. **Monitor query performance**:
   \\\sql
   -- Find slow queries
   SELECT query, calls, mean_time 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 10;
   \\\

4. **Configure autovacuum**:
   \\\sql
   ALTER SYSTEM SET autovacuum = on;
   ALTER SYSTEM SET autovacuum_naptime = '10s';
   SELECT pg_reload_conf();
   \\\

## Rollback Plan

If something goes wrong:

1. Keep SQLite backup intact
2. Switch DATABASE_URL back to SQLite
3. Revert Prisma schema provider to sqlite
4. Restart application
5. No data loss (SQLite backup untouched)

\\\ash
# Rollback steps
git checkout prisma/schema.prisma
DATABASE_URL=\"file:./prisma/dev.db\" npm run dev
\\\

## Next Steps

After successful migration:
- [ ] Delete SQLite development database (if confident)
- [ ] Set up automated backups
- [ ] Configure database monitoring
- [ ] Plan performance testing with real traffic
- [ ] Document connection string in team password manager
