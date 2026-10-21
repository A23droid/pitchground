#!/bin/bash
# One-time image builder. InstanceInitiatedShutdownBehavior must be "terminate".
set -euo pipefail
export AWS_DEFAULT_REGION=ap-south-1
BUCKET=pitchground-ml-875691018816-ap-south-1
IMAGE_URI=875691018816.dkr.ecr.ap-south-1.amazonaws.com/pitchground-ml:20261021-cbb0559efe58
STATUS_PREFIX=build-status/20261021-cbb0559efe58
# The shutdown timer is independent of the build's success and prevents idle compute.
shutdown -h +55
finish() {
    code=$?
    trap - EXIT
    if [ "$code" -eq 0 ]; then status=SUCCEEDED; else status=FAILED; fi
    printf '{"status":"%s","exit_code":%d,"image":"%s"}\n' "$status" "$code" "$IMAGE_URI" >/tmp/build-result.json
    aws s3 cp /var/log/cloud-init-output.log "s3://$BUCKET/$STATUS_PREFIX/build.log" --only-show-errors || true
    aws s3 cp /tmp/build-result.json "s3://$BUCKET/$STATUS_PREFIX/result.json" --content-type application/json --only-show-errors || true
    shutdown -h now
}
trap finish EXIT
dnf install -y docker unzip
systemctl start docker
mkdir -p /opt/pitchground-build
cd /opt/pitchground-build
aws s3 cp "s3://$BUCKET/build-source/worker-cbb0559efe58.zip" source.zip --only-show-errors
unzip -q source.zip
aws ecr get-login-password --region "$AWS_DEFAULT_REGION" | docker login --username AWS --password-stdin 875691018816.dkr.ecr.ap-south-1.amazonaws.com
docker build --platform linux/amd64 --build-arg WHISPER_MODEL=small -f Dockerfile.sagemaker -t "$IMAGE_URI" .
docker run -d --name pitchground-smoke -p 127.0.0.1:8080:8080 "$IMAGE_URI" serve
timeout 90 sh -c 'until curl --fail --silent http://127.0.0.1:8080/ping; do sleep 2; done'
docker stop pitchground-smoke
docker rm pitchground-smoke
docker push "$IMAGE_URI"
