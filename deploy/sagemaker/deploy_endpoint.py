"""Create a new asynchronous endpoint. Dry run by default; --apply creates billable AWS resources."""
import argparse
import json
import re
from datetime import datetime, timezone


def build_plan(args):
    if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?", args.endpoint):
        raise ValueError("Endpoint name must contain 1-63 letters, digits or hyphens and start/end with a letter or digit")
    name = args.endpoint[:49].rstrip("-") + "-" + datetime.now(timezone.utc).strftime("%m%d%H%M%S")
    environment = {"ML_EXECUTION_MODE": "local", "AWS_DEFAULT_REGION": args.region,
                   "SAGEMAKER_BUCKET": args.bucket, "SAGEMAKER_JOB_PREFIX": "pitchground/jobs",
                   "PITCHGROUND_LLM_SECRET_ARN": args.secret_arn}
    return {
        "model": {"ModelName": name, "ExecutionRoleArn": args.role_arn,
                  "PrimaryContainer": {"Image": args.image, "Environment": environment}},
        "config": {"EndpointConfigName": name,
            "ProductionVariants": [{"VariantName": "AllTraffic", "ModelName": name,
                "InstanceType": args.instance_type, "InitialInstanceCount": 1,
                "ContainerStartupHealthCheckTimeoutInSeconds": 600}],
            "AsyncInferenceConfig": {"OutputConfig": {
                "S3OutputPath": f"s3://{args.bucket}/pitchground/results/output",
                "S3FailurePath": f"s3://{args.bucket}/pitchground/results/failure"},
                "ClientConfig": {"MaxConcurrentInvocationsPerInstance": 1}}},
        "endpoint": {"EndpointName": args.endpoint, "EndpointConfigName": name}}


def configure_scaling(session, endpoint):
    scaling = session.client("application-autoscaling")
    common = {"ServiceNamespace": "sagemaker", "ResourceId": f"endpoint/{endpoint}/variant/AllTraffic",
              "ScalableDimension": "sagemaker:variant:DesiredInstanceCount"}
    scaling.register_scalable_target(**common, MinCapacity=0, MaxCapacity=1)
    dimensions = [{"Name": "EndpointName", "Value": endpoint}]
    scaling.put_scaling_policy(**common, PolicyName=endpoint + "-backlog", PolicyType="TargetTrackingScaling",
        TargetTrackingScalingPolicyConfiguration={"TargetValue": 1.0, "ScaleInCooldown": 300,
            "ScaleOutCooldown": 30, "CustomizedMetricSpecification": {
                "MetricName": "ApproximateBacklogSizePerInstance", "Namespace": "AWS/SageMaker",
                "Dimensions": dimensions, "Statistic": "Average"}})
    wake = scaling.put_scaling_policy(**common, PolicyName=endpoint + "-wake", PolicyType="StepScaling",
        StepScalingPolicyConfiguration={"AdjustmentType": "ChangeInCapacity", "MetricAggregationType": "Average",
            "Cooldown": 300, "StepAdjustments": [{"MetricIntervalLowerBound": 0, "ScalingAdjustment": 1}]})
    session.client("cloudwatch").put_metric_alarm(AlarmName=endpoint + "-wake",
        MetricName="HasBacklogWithoutCapacity", Namespace="AWS/SageMaker", Statistic="Average",
        Dimensions=dimensions, Period=60, EvaluationPeriods=2, DatapointsToAlarm=2,
        Threshold=1, ComparisonOperator="GreaterThanOrEqualToThreshold", TreatMissingData="missing",
        AlarmActions=[wake["PolicyARN"]])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("region", "endpoint", "image", "role-arn", "bucket", "secret-arn"):
        parser.add_argument("--" + flag, required=True)
    parser.add_argument("--instance-type", default="ml.m5.xlarge")
    parser.add_argument("--apply", action="store_true", help="Create billable resources and wait for endpoint readiness")
    parser.add_argument("--scaling-only", action="store_true", help="With --apply, repair scaling for an existing endpoint")
    args = parser.parse_args()
    plan = build_plan(args)
    print(json.dumps(plan, indent=2))
    if not args.apply:
        print("Dry run only. No AWS requests made. Review IAM, quotas and costs before adding --apply.")
        return
    import boto3
    session = boto3.Session(region_name=args.region)
    sm = session.client("sagemaker")
    if not args.scaling_only:
        # Refuse to replace an existing deployment; updates require an explicit deployment plan.
        try:
            sm.describe_endpoint(EndpointName=args.endpoint)
        except sm.exceptions.ClientError as exc:
            if exc.response["Error"]["Code"] != "ValidationException" or "Could not find" not in exc.response["Error"]["Message"]:
                raise
        else:
            raise SystemExit("Endpoint already exists. Use a new endpoint name, or --scaling-only to repair autoscaling.")
        sm.create_model(**plan["model"])
        sm.create_endpoint_config(**plan["config"])
        sm.create_endpoint(**plan["endpoint"])
        print("Waiting for endpoint creation. If interrupted, configure scaling with --apply --scaling-only.")
    sm.get_waiter("endpoint_in_service").wait(EndpointName=args.endpoint,
        WaiterConfig={"Delay": 30, "MaxAttempts": 120})
    configure_scaling(session, args.endpoint)
    print("Endpoint ready; scale-to-zero and wake-on-request policies configured. Check AWS billing and alarms.")


if __name__ == "__main__":
    main()
