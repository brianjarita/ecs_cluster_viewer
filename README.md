Cluster Viewer For ECS
======================

1. Install and setup a python environment with [Flask](http://flask.pocoo.org/) and [Boto3](https://github.com/boto/boto3)

2. Generate an AWS Key Pair with access to:
    + ECS Describe Clusters
    + ECS Describe Container Instances
    + ECS Describe Tasks
    + ECS Describe Task Definition
    + ECS List Container Instances
    + ECS List Tasks

3. Update settings.py to use your key pair

4. Run clusterviewer.py

        python clusterviewer.py

5. Checkout the viewer at [http://localhost:8000/](http://localhost:8000/)
