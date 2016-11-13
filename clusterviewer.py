import json
import os

from boto3.session import Session
from flask import Flask, redirect, request
from werkzeug import secure_filename
from settings import aws_access_key_id, aws_secret_access_key

DEBUG = False
session = Session(
    aws_access_key_id=aws_access_key_id,
    aws_secret_access_key=aws_secret_access_key,
    region_name="us-west-2"
)

app = Flask(__name__)


@app.route('/', methods=['GET', 'POST'])
def index():
    if not request.args.get("cluster", ""):
        return redirect("/?cluster=default", 302)
    with open("index.html", "r") as fh:
        data = fh.read()
    return data


@app.route('/api/cluster_info/', methods=['GET', 'POST'])
def cluster_info():
    client = session.client("ecs")
    cluster_arn = ""
    cluster_name = request.args.get("cluster", "")

    # The index of the ARN is the same as the index of the container
    data = {
        "containerInstances": [],
        "taskDefinitions": [],
        "maxMB": 0,
        "containerInstanceARNs": [],
        "taskDefinitionARNs": [],
    }
    task_definitions = []
    if not request.args.get("cluster", ""):
        return redirect("/?cluster=default", 302)

    try:
        cluster_arn = client.describe_clusters(
            clusters=[cluster_name]
        ).get("clusters")[0].get("clusterArn")
        if cluster_arn:
            container_instances = client.list_container_instances(
                cluster=cluster_arn).get("containerInstanceArns", [])
            if container_instances:
                for instance in client.describe_container_instances(
                    cluster=cluster_arn,
                    containerInstances=container_instances).get(
                        "containerInstances", []):

                    instance_data = {
                        "instance": instance["ec2InstanceId"],
                        "tasks": []
                    }

                    for resource in instance["registeredResources"]:
                        if resource.get("name", "") == "CPU":
                            instance_data["cpu"] = resource["integerValue"]
                        elif resource.get("name", "") == "MEMORY":
                            if resource["integerValue"] > data["maxMB"]:
                                data["maxMB"] = resource["integerValue"]
                            instance_data["memory"] = resource["integerValue"]

                    data["containerInstances"].append(instance_data)
                    data["containerInstanceARNs"].append(
                        instance["containerInstanceArn"])

            tasks = client.list_tasks(cluster=cluster_arn).get("taskArns", [])
            if tasks:
                task_details = client.describe_tasks(
                    cluster=cluster_arn, tasks=tasks)
                for task_definition in set([
                    task["taskDefinitionArn"] for task in
                        task_details["tasks"]]):

                    response = client.describe_task_definition(
                        taskDefinition=task_definition)
                    task_memory = sum(row.get("memory", 0) for row in response[
                        "taskDefinition"]["containerDefinitions"])

                    data["taskDefinitions"].append({
                        "memory": task_memory,
                        "name": task_definition.split(":", 5).pop()
                    })
                    data["taskDefinitionARNs"].append(task_definition)

                for task in task_details["tasks"]:
                    container_idx = data["containerInstanceARNs"].index(
                        task["containerInstanceArn"])
                    idx = data["taskDefinitionARNs"].index(
                        task["taskDefinitionArn"])
                    memory = data["taskDefinitions"][idx]["memory"]

                    data["containerInstances"][container_idx]["tasks"].append({
                        "color": idx,
                        "memory": memory
                    })

    except (AttributeError, IndexError, KeyError, TypeError, ValueError):
        pass

    return json.dumps(data)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000)
