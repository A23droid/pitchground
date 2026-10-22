# Pause and resume the deployed ML endpoint

Run these commands in AWS CloudShell (Mumbai) or an authenticated AWS CLI terminal. No API key needs to be pasted into these commands. Use an operator identity with SageMaker capacity-update and Application Auto Scaling permissions; the restricted Render runtime identity intentionally cannot administer the endpoint.

## Turn off

Finish any active practice analysis first. Run both commands in order and stop if either fails. Suspending scaling prevents queued/new requests from waking the endpoint; setting capacity to zero removes inference instances.

```powershell
aws application-autoscaling register-scalable-target --region ap-south-1 --service-namespace sagemaker --resource-id endpoint/pitchground-ml-v1/variant/AllTraffic --scalable-dimension sagemaker:variant:DesiredInstanceCount --min-capacity 0 --max-capacity 1 --suspended-state DynamicScalingInSuspended=true,DynamicScalingOutSuspended=true,ScheduledScalingSuspended=true
aws sagemaker update-endpoint-weights-and-capacities --region ap-south-1 --endpoint-name pitchground-ml-v1 --desired-weights-and-capacities VariantName=AllTraffic,DesiredInstanceCount=0
aws sagemaker wait endpoint-in-service --region ap-south-1 --endpoint-name pitchground-ml-v1
```

## Turn on

Run in order, stopping on errors. The wait may take several minutes while the full models load. Resuming scaling restores automatic idle scale-down and wake-on-request.

```powershell
aws sagemaker update-endpoint-weights-and-capacities --region ap-south-1 --endpoint-name pitchground-ml-v1 --desired-weights-and-capacities VariantName=AllTraffic,DesiredInstanceCount=1
aws sagemaker wait endpoint-in-service --region ap-south-1 --endpoint-name pitchground-ml-v1
aws application-autoscaling register-scalable-target --region ap-south-1 --service-namespace sagemaker --resource-id endpoint/pitchground-ml-v1/variant/AllTraffic --scalable-dimension sagemaker:variant:DesiredInstanceCount --min-capacity 0 --max-capacity 1 --suspended-state DynamicScalingInSuspended=false,DynamicScalingOutSuspended=false,ScheduledScalingSuspended=false
```

## Verify

```powershell
aws sagemaker describe-endpoint --region ap-south-1 --endpoint-name pitchground-ml-v1 --query "{Status:EndpointStatus,Instances:ProductionVariants[].{Current:CurrentInstanceCount,Desired:DesiredInstanceCount}}"
aws application-autoscaling describe-scalable-targets --region ap-south-1 --service-namespace sagemaker --resource-ids endpoint/pitchground-ml-v1/variant/AllTraffic --query "ScalableTargets[].SuspendedState"
```

Off means Current=0, Desired=0, and all three suspension flags=true. EndpointStatus can still read InService at zero instances; that alone does not mean compute is running. Repeat the verification until capacity reaches zero. Do not run the deployment/scaling-repair script while intentionally paused because that can change scaling settings.

ML analysis cannot complete while paused. Async requests can queue and may expire; avoid submitting practice recordings until resumed. Model images, endpoint configuration, secrets, and stored data are retained. Zero inference instances stops inference-instance compute charges, but ECR/S3 storage, Secrets Manager, CloudWatch and other account resources can still incur charges; this is not a zero-total-bill switch.

References: [AWS async scale-to-zero](https://docs.aws.amazon.com/sagemaker/latest/dg/async-inference-autoscale.html), [suspend/resume autoscaling](https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-suspend-resume-scaling.html).
