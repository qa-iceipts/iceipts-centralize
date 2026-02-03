# Deployment Guide - Secure Key Management

## Security Notice

**IMPORTANT**: Private keys (`.pem` files) are NEVER committed to git. They are excluded via `.gitignore` and `.dockerignore`.

## Required Keys

The application requires the following private key files:

### VAHAN API Keys
- `services/vahanApis/UATprivate.pem` - UAT environment private key
- `services/vahanApis/UATpublic.pem` - UAT environment public key
- `services/vahanApis/PRODprivate.pem` - Production environment private key
- `services/vahanApis/PRODpublic.pem` - Production environment public key

### eWay Bill Keys
- `keys/eway/private.pem` - eWay Bill private key
- `keys/eway/public.pem` - eWay Bill public key

### Alternative VAHAN Keys (used by gateway config)
- `keys/vahan/UATprivate.pem`
- `keys/vahan/UATpublic.pem`
- `keys/vahan/PRODprivate.pem`
- `keys/vahan/PRODpublic.pem`

## Local Development

1. Ensure all key files exist in their respective directories
2. Keys are automatically excluded from git by `.gitignore`
3. Run normally: `npm start`

## Docker Deployment

### Using Docker Compose (Recommended)

The `docker-compose.yml` file is configured to mount keys from the host:

```bash
# Ensure keys exist on the host machine
ls -R keys/
ls services/vahanApis/*.pem

# Start the application
docker-compose up -d

# View logs
docker-compose logs -f
```

### Using Docker Run

If not using docker-compose, mount keys manually:

```bash
docker build -t iceipts-gateway .

docker run -d \
  --name iceipts-gateway \
  -p 5000:5000 \
  -v $(pwd)/keys:/app/keys:ro \
  -v $(pwd)/services/vahanApis/UATprivate.pem:/app/services/vahanApis/UATprivate.pem:ro \
  -v $(pwd)/services/vahanApis/UATpublic.pem:/app/services/vahanApis/UATpublic.pem:ro \
  -v $(pwd)/services/vahanApis/PRODprivate.pem:/app/services/vahanApis/PRODprivate.pem:ro \
  -v $(pwd)/services/vahanApis/PRODpublic.pem:/app/services/vahanApis/PRODpublic.pem:ro \
  --env-file .env \
  iceipts-gateway
```

## Server Deployment

### Option 1: Copy Keys Securely to Server

```bash
# On your local machine, securely copy keys to server
# Use SCP (replaces server_user and server_ip with actual values)
scp -r keys/ server_user@server_ip:/path/to/app/keys/
scp services/vahanApis/*.pem server_user@server_ip:/path/to/app/services/vahanApis/

# Then SSH into server and deploy
ssh server_user@server_ip
cd /path/to/app
docker-compose up -d
```

### Option 2: Use Docker Secrets (Docker Swarm)

```bash
# Create secrets
docker secret create vahan_uat_private services/vahanApis/UATprivate.pem
docker secret create eway_private keys/eway/private.pem
# ... repeat for all keys

# Update docker-compose.yml to use secrets instead of volumes
```

### Option 3: Use Cloud Secrets Manager

For AWS, Azure, or GCP deployments, consider using:
- **AWS Secrets Manager** or **AWS Systems Manager Parameter Store**
- **Azure Key Vault**
- **Google Cloud Secret Manager**

This requires code changes to fetch keys from the secrets manager at runtime.

## Key Rotation After Security Incident

**CRITICAL**: If keys were exposed in git (as detected by GitGuardian), you MUST:

1. **Generate new keys** from your API providers (VAHAN, eWay Bill)
2. **Replace all `.pem` files** with the new keys
3. **Update keys on all deployed servers**
4. **Revoke the old exposed keys** with your API providers

Contact your API providers:
- VAHAN API: Request new encryption keys
- eWay Bill (NIC): Request new private/public key pair

## Verifying Deployment

After deployment, check that keys are accessible:

```bash
# Inside container
docker exec -it iceipts-gateway ls -la /app/keys/
docker exec -it iceipts-gateway ls -la /app/services/vahanApis/*.pem
```

## Troubleshooting

### Error: ENOENT: no such file or directory, open '/app/services/vahanApis/UATprivate.pem'

**Cause**: Keys are not mounted or don't exist on host

**Solution**:
1. Verify keys exist locally: `ls -R keys/ services/vahanApis/*.pem`
2. If using docker-compose, volumes will mount from current directory
3. If keys are missing, you need to obtain them from your API providers

### Keys are mounted but still getting errors

**Cause**: File permissions or read-only mount issues

**Solution**:
```bash
# Ensure keys have correct permissions on host
chmod 600 keys/**/*.pem services/vahanApis/*.pem

# Check mounted files in container
docker exec -it iceipts-gateway ls -la /app/keys/
```

## Best Practices

1. **Never commit keys to git** - Always keep keys local or in secure storage
2. **Use read-only mounts** (`:ro`) when mounting keys to containers
3. **Restrict file permissions** - Keys should be readable only by app user (chmod 600)
4. **Rotate keys regularly** - Especially after any potential exposure
5. **Use secrets management** - For production, use proper secrets management solutions
6. **Backup keys securely** - Store backup copies in encrypted, secure locations
