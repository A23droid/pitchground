# Full model deployment: Vercel + Render + AWS SageMaker

The frontend stays on Vercel. Render runs authentication, database access, media transfer and AWS job submission. SageMaker runs the existing multilingual Whisper model, acoustic and waveform filler analysis, MediaPipe face/pose/hands, answer validation, scoring and recovery analysis. Model sizes, decoding settings and scoring policy are unchanged. Sarvam is still used only for the debate agent's text-to-speech.

SageMaker is **not guaranteed free**. Instance uptime, S3, ECR image storage, Secrets Manager, CloudWatch and data transfer can incur charges. Scale-to-zero reduces idle inference cost; cold starts can take several minutes. Free-tier credits depend on your AWS account. Set an AWS Budget before creating resources. This setup targets a lightweight 512 MB Render process; actual peak RAM and production concurrency must still be measured after deployment.

## 1. Create the AWS resources

Use one AWS account and region for all resources. Check the SageMaker quota for **`ml.m5.xlarge` asynchronous endpoint usage**; request an increase if zero. This CPU instance is the starting configuration for the existing models, not a measured capacity guarantee. A larger instance can improve speed without changing model quality.

1. Create a dedicated private S3 bucket. Keep Block Public Access enabled, ACLs disabled, default SSE-S3 encryption enabled, and versioning disabled for short-lived recordings. Do not put unrelated files in it.
2. Apply `deploy/sagemaker/lifecycle.json` to this dedicated bucket to expire job inputs and outputs after one day. The application database retains the completed analysis. S3 lifecycle cleanup is asynchronous; review retention before enabling it. If you enable versioning, also configure noncurrent-version expiration.
3. Create a private ECR repository named `pitchground-ml` with an image lifecycle policy to retain only the versions you need. Use an immutable version tag for each deployment.
4. Create a Secrets Manager secret containing a JSON object with `GROQ_API_KEY` or `GROQ_ANSWERS_API_KEY` and optionally `GROQ_MODEL` / `GROQ_ANSWERS_MODEL`. This enables real answer validation inside the worker. These are your existing Groq credentials, not AWS credentials. Never bake secrets into the image.
5. Create an IAM execution role for SageMaker using `execution-role-trust.json` and `execution-policy.json`. Replace **every** `REGION`, `ACCOUNT_ID`, `BUCKET_NAME` and `LLM_SECRET_ARN` placeholder. This role reads job media, writes inference output, pulls the ECR image, writes logs and reads the provider secret. It does not need your database, JWT, Nhost or Sarvam secrets.
6. Create a separate IAM user or federated identity for the Render application. Attach only the substituted `render-policy.json`. Do not use AWS root credentials or give Render administrator permissions. AWS requests are signed with IAM credentials; there is no standalone SageMaker API key.

Use AWS CLI with a deployment/admin identity on your computer for resource creation. That identity needs SageMaker creation/describe permissions, `iam:PassRole` for the execution role, ECR image upload, Application Auto Scaling and CloudWatch alarm permissions, and permission to create the SageMaker autoscaling service-linked role if it does not exist. These permissions do not belong on Render.

## 2. Build and upload the worker image

If Docker is unavailable locally, `deploy/sagemaker/package_source.py` creates an allowlisted ZIP for a private build bucket. `buildspec.yml` builds and health-checks the same image in CodeBuild. `build-on-ec2.sh` is a one-time fallback for an account whose CodeBuild quota is zero; it requires the scoped builder instance profile, no inbound ports, a root volume deleted on termination, and `InstanceInitiatedShutdownBehavior=terminate`. It schedules shutdown after 55 minutes and shuts down immediately on completion/failure. Its account, region, source object and image tag must match the reviewed deployment. The machine and its attached volume still incur charges until termination is confirmed. These helpers never contain provider credentials or user recordings.

Install Docker and AWS CLI locally. From the project root, replace the example region, account and version tag with your values. The Docker build downloads public model assets, never user recordings. The current default is the same multilingual `small` Whisper model used locally.

```powershell
aws ecr get-login-password --region YOUR_REGION | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com
docker build --platform linux/amd64 -f backend/Dockerfile.sagemaker -t pitchground-ml:v1 backend
docker tag pitchground-ml:v1 ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/pitchground-ml:v1
docker push ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/pitchground-ml:v1
```

If your existing deployment uses another `WHISPER_MODEL`, set the Docker build argument to match it: `--build-arg WHISPER_MODEL=medium`. Do not change the model to save Render memory: all inference runs on AWS. Keep `ML_EXECUTION_MODE=local` **inside the worker**, where local means the AWS container's full models. Do not enable network isolation without arranging access to S3, Secrets Manager and the external Groq service.

The container serves `/ping` and `/invocations` on port 8080, accepts SageMaker's `serve` argument, and limits inference concurrency to one job per instance. It validates downloaded media sizes and rejects recordings longer than six minutes; increase `MAX_RECORDING_SECONDS` in the model environment if your product needs longer sessions, then review the inference timeout. No custom domain or public worker URL is required.

## 3. Create the asynchronous endpoint

Install `boto3` in your local deployment Python environment. Review the plan first; without `--apply`, this script makes no AWS calls:

```powershell
python -m pip install "boto3>=1.35,<2"
python deploy/sagemaker/deploy_endpoint.py --region YOUR_REGION --endpoint pitchground-ml-v1 --bucket BUCKET_NAME --image ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/pitchground-ml:v1 --role-arn arn:aws:iam::ACCOUNT_ID:role/PitchgroundSageMakerRole --secret-arn YOUR_LLM_SECRET_ARN
```

After reviewing the JSON, repeat that command with `--apply` to create billable resources. The script waits for the endpoint to become `InService` and configures minimum instances 0, maximum 1, backlog target tracking and a wake-from-zero alarm. Initial provisioning uses one billable instance; scaling to zero happens after idle metrics are observed. If interrupted after endpoint creation, repeat with `--apply --scaling-only` to finish autoscaling. An existing endpoint is never silently replaced. For a new image deploy under a new endpoint name, smoke-test it, switch Render's endpoint setting, then remove the old endpoint when no jobs remain.

If creation fails or you stop using the deployment, inspect the AWS console for remaining endpoint resources. Deleting just the Render service does not stop AWS billing. To retire a deployment: delete its SageMaker endpoint, remove its autoscaling target/policies and wake alarm, delete unused endpoint configurations/models, then review ECR images, S3 objects, secrets and log retention. Do not delete resources serving another deployment.

## 4. Configure Render

Set **Root Directory** to `backend`, Python to 3.11 (the `.python-version` file is included), and use:

**Build Command**

```sh
pip install -r requirements-api.txt
```

**Start Command**

```sh
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
```

Do not run model download scripts or install `requirements.txt` on Render. Set the health-check path to `/health`. Use **Clear build cache & deploy** when switching from the previous ML installation.

Add these server-side environment variables in Render's Environment settings:

```dotenv
ML_EXECUTION_MODE=sagemaker
AWS_REGION=YOUR_REGION
AWS_ACCESS_KEY_ID=YOUR_RENDER_IAM_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_RENDER_IAM_SECRET_ACCESS_KEY
SAGEMAKER_ENDPOINT_NAME=pitchground-ml-v1
SAGEMAKER_BUCKET=YOUR_PRIVATE_BUCKET
SAGEMAKER_JOB_PREFIX=pitchground/jobs
SAGEMAKER_OUTPUT_PREFIX=pitchground/results
SAGEMAKER_INVOCATION_TIMEOUT_SECONDS=900
SAGEMAKER_QUEUE_TIMEOUT_SECONDS=900
```

`AWS_SESSION_TOKEN` is required **only** when using temporary STS credentials; replace the key ID, secret and token together before expiration. Otherwise leave it unset. Never add AWS secrets to Vercel, `NEXT_PUBLIC_*`, Git, or chat. The frontend only needs the existing `NEXT_PUBLIC_API_URL` pointing at Render.

Keep your existing production `DATABASE_URL`, `JWT_SECRET`, Google OAuth, CORS/frontend/backend URLs, `GROQ_*`, Sarvam TTS and mail configuration on Render. Use external Postgres and `STORAGE_BACKEND=nhost` with the existing Nhost storage variables, since Render's free filesystem is ephemeral. Keep `DEMO_AUTH=0` if guest access is not intended. SageMaker input tickets survive Render restarts in S3; original recordings must reach SageMaker before submission returns success.

## 5. Verify before switching users

1. Confirm the SageMaker endpoint is `InService`, and CloudWatch `/aws/sagemaker/Endpoints/<endpoint-name>` has no startup/model-asset errors.
2. Confirm Render `/health` returns `ok`. This checks API startup, **not** an inference round trip.
3. Log in. Submit an interview recording containing Hindi and pauses, plus optional video. Confirm the attempt changes from queued to complete, transcript retains the spoken language and real timestamps, and metrics match the returned worker result.
4. Check debate speech transcription, impromptu, both language-diagnostic attempts and recovery training. Recorded audio/video goes to SageMaker; Groq generates/reviews content, and Sarvam only speaks the debate agent's generated response.
5. Refresh during a queued job and confirm polling resumes through the stored attempt job ID. Verify another learner cannot retrieve it. Retry a failed recording and confirm a new job is submitted without duplicating history.
6. Confirm autoscaling reaches zero after idle time and a single new request wakes it. Watch Render's peak memory during uploads and simultaneous logins; one worker and streaming media reduce memory pressure, but 512 MB is not an unlimited concurrency guarantee.

Browser speech and analysis polling waits up to 30 minutes for cold-start/queued inference. The default job queue TTL and execution timeout are 15 minutes each; keep their sum within that browser wait if changing defaults. Failed jobs show a retryable error instead of invented scores. Return to a submitted attempt to persist its result before one-day S3 expiration.

## Troubleshooting

- **AWS credential error:** check the Render IAM key pair, region, optional token expiry, IAM policy and exact endpoint ARN. The worker uses its execution role, never Render's keys.
- **AccessDenied for S3:** check both policies, bucket policy and prefixes. This setup assumes SSE-S3; a bucket enforcing KMS needs additional key configuration and KMS permissions.
- **Endpoint creation says execution role is invalid:** the worker role must allow bucket-level `s3:ListBucket` without an `s3:prefix` condition, because SageMaker validates the dedicated input/output bucket with a bucket-level check. Object reads and writes remain scoped to the job and result prefixes. The Render caller's separate ListBucket permission can remain prefix-scoped.
- **Endpoint quota/capacity error:** request the asynchronous instance quota in that region or choose an available compatible instance. Do not swap to an ARM instance for this x86 image.
- **Queued indefinitely:** inspect the wake alarm, autoscaling events, endpoint state, SageMaker role access to the input bucket, and CloudWatch logs. Do not remove the wake-from-zero policy.
- **Model asset/startup error:** rebuild the image with all three vision assets, Whisper cache and the filled-pause classifier. No silent reduced-quality fallback is added.
- **Groq error in worker:** verify the secret's JSON keys and execution-role `GetSecretValue` permission. A changed secret is read on container startup; roll the deployment to apply changes to running containers.
- **Cannot reach API:** inspect Render restart/OOM logs and CORS separately from SageMaker failures. The new architecture does not prevent Render free-tier sleep or unrelated network failures.

AWS references: [asynchronous inference](https://docs.aws.amazon.com/sagemaker/latest/dg/async-inference.html), [scale-to-zero and wake policies](https://docs.aws.amazon.com/sagemaker/latest/dg/async-inference-autoscale.html), [custom inference container contract](https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-inference-code.html).
