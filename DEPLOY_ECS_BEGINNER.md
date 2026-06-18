# Deploy to AWS ECS (Beginner Guide)

This project has two apps:

- `server` (Node.js API)
- `client` (React + Vite frontend, served by Nginx)

Recommended production setup:

1. **ECS Fargate service for backend API**
2. **ECS Fargate service for frontend web app**
3. **One Application Load Balancer (ALB)** in front of both services
4. **Path-based routing**:
   - `/backend/*` -> backend target group
   - `/*` -> frontend target group

This keeps deployment simple for beginners while still production-ready.

---

## 0) Prerequisites

Install locally:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

Configure AWS CLI:

```bash
aws configure
```

You will enter:

- AWS Access Key ID
- AWS Secret Access Key
- Region (for example `us-east-1`)
- Output format (`json`)

---

## 1) Create ECR repositories (one time)

Use your AWS region:

```bash
aws ecr create-repository --repository-name mortgage-crm-backend --region <REGION>
aws ecr create-repository --repository-name mortgage-crm-frontend --region <REGION>
```

---

## 2) Build and push Docker images

Set variables in terminal (PowerShell syntax):

```powershell
$REGION="<REGION>"
$ACCOUNT_ID="<AWS_ACCOUNT_ID>"
$BACKEND_REPO="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/mortgage-crm-backend"
$FRONTEND_REPO="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/mortgage-crm-frontend"
$IMAGE_TAG="v1"
```

Login to ECR:

```powershell
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
```

Build and push backend:

```powershell
docker build -t "$BACKEND_REPO`:$IMAGE_TAG" ./server
docker push "$BACKEND_REPO`:$IMAGE_TAG"
```

Build and push frontend (**replace your domain**):

```powershell
docker build --build-arg VITE_SERVER_URL="https://<YOUR_DOMAIN>/backend/api" -t "$FRONTEND_REPO`:$IMAGE_TAG" ./client
docker push "$FRONTEND_REPO`:$IMAGE_TAG"
```

---

## 3) Create IAM roles

In AWS IAM create:

1. **ECS task execution role** (usually `ecsTaskExecutionRole`) with:
   - `AmazonECSTaskExecutionRolePolicy`
2. **Backend task role** (example: `mortgage-crm-backend-task-role`) with only required permissions:
   - S3 access to your app bucket
   - Textract permissions if used
   - Bedrock permissions if used

Important:

- The backend code supports ECS task-role credentials.
- You do **not** need to hardcode `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in ECS env vars.

---

## 4) Create ECS cluster

- ECS -> Clusters -> Create cluster
- Launch type: **AWS Fargate (networking only)**
- Name example: `mortgage-crm-cluster`

---

## 5) Create CloudWatch log groups

Create:

- `/ecs/mortgage-crm-backend`
- `/ecs/mortgage-crm-frontend`

---

## 6) Create backend task definition

ECS -> Task definitions -> Create new task definition

- Launch type: **Fargate**
- Task role: `mortgage-crm-backend-task-role`
- Execution role: `ecsTaskExecutionRole`
- OS/Arch: Linux/x86_64
- Task CPU/Memory: start with `1 vCPU` / `2 GB`

Container settings:

- Name: `backend`
- Image: `<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/mortgage-crm-backend:v1`
- Container port: `3000`
- Health check command:
  - `CMD-SHELL,curl -f http://localhost:3000/healthz || exit 1`
- Log driver: awslogs
  - Group: `/ecs/mortgage-crm-backend`
  - Region: your region
  - Stream prefix: `ecs`

Environment variables (minimum):

- `NODE_ENV=production`
- `PORT=3000`
- `MONGO_URI=...`
- `FRONTEND_URL=https://<YOUR_DOMAIN>`
- `SMTP_HOST=...`
- `SMTP_PORT=...`
- `EMAIL_USER=...`
- `EMAIL_PASS=...`
- `AWS_REGION=<REGION>`
- `S3_BUCKET_NAME=<YOUR_BUCKET>`
- `OPENAI_API_KEY=...` (if using OpenAI)
- Stripe variables if billing is enabled

---

## 7) Create frontend task definition

- Launch type: **Fargate**
- Execution role: `ecsTaskExecutionRole`
- CPU/Memory: start with `0.5 vCPU` / `1 GB`

Container settings:

- Name: `frontend`
- Image: `<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/mortgage-crm-frontend:v1`
- Container port: `80`
- Health check command:
  - `CMD-SHELL,wget -qO- http://localhost/healthz || exit 1`
- Log group: `/ecs/mortgage-crm-frontend`

---

## 8) Create networking + ALB

1. Create or pick VPC with at least two public subnets.
2. Create one Application Load Balancer (internet-facing).
3. Create two target groups:
   - `tg-mortgage-backend` (HTTP 3000, health path `/healthz`)
   - `tg-mortgage-frontend` (HTTP 80, health path `/healthz`)
4. ALB listener rules on port 80/443:
   - Rule 1: path `/backend/*` -> backend target group
   - Default rule: forward to frontend target group

---

## 9) Create ECS services

Create **two** services inside the same cluster:

- `mortgage-crm-backend-svc` from backend task definition
- `mortgage-crm-frontend-svc` from frontend task definition

For each service:

- Launch type: Fargate
- Desired count: 1
- Select VPC + subnets
- Security group:
  - Allow inbound from ALB security group to container port (3000 or 80)
- Attach to ALB and choose matching target group

---

## 10) DNS + HTTPS (recommended)

Use Route53 + ACM:

1. Request ACM certificate for your domain.
2. Add HTTPS listener on ALB (port 443) with certificate.
3. Point domain A/ALIAS record to ALB.
4. Update backend env:
   - `FRONTEND_URL=https://<YOUR_DOMAIN>`

---

## 11) Updating deployment later

For every code update:

1. Build new image with a new tag (`v2`, `v3`, etc.)
2. Push to ECR
3. Update ECS task definition image tag
4. Deploy new task definition revision in service

---

## Troubleshooting

- If frontend cannot call API:
  - verify frontend build arg `VITE_SERVER_URL`
  - verify ALB rule for `/backend/*`
  - verify backend `FRONTEND_URL` includes your frontend domain
- If backend task keeps restarting:
  - check CloudWatch logs for missing env vars
  - test `/healthz` locally in container
- If S3/Textract/Bedrock calls fail:
  - verify backend task role permissions
  - verify `AWS_REGION` and bucket names
