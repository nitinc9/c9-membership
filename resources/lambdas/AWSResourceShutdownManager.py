# Description: Lambda to shutdown AWS resources.
#
# Author: Nitin Patil (cloudnineapps.com)
#
# Usage:
# - Optional: Set the 'ec2NameFilter' global variable to specify a name pattern for the EC2 instances. Examples
#   *dev*
#   c9-membership-app-* 
#   c9-membership-app-dev 
# - Schedule via cron (CloudWatch scheduled rule). Example
#   0 18-23,0-9 * * ? * (Every hour between 6pm-9am UTC)
#

import boto3
import logging

# Globals
logger = logging.getLogger()
logger.setLevel(logging.INFO)
ec2NameFilter = "*"

def lambda_handler(event, context):
    # Shutdown EC2 instances
    logger.info("Retrieving instances matching pattern: %s" % ec2NameFilter)
    ec2 = boto3.client('ec2')
    filters = [{'Name': 'tag:Name', 'Values':[ec2NameFilter]}]
    response = ec2.describe_instances(Filters=filters)
    logger.debug("EC2 response: %s" % response)
    instance_ids = []
    for reservation in response["Reservations"]:
        for instance in reservation["Instances"]:
            state = instance['State']['Name']
            if (state != 'stopped'):
                instance_ids.append(instance["InstanceId"])
    if (len(instance_ids) > 0):
        logger.info("Shutting down instances: %s" % instance_ids)
        ec2.stop_instances(InstanceIds=instance_ids)
    else:
      logger.info("All EC2 instances are already stopped.")
    
    # Shutdown RDS instances
    logger.info("Retrieving RDS instances")
    rds = boto3.client('rds')
    response = rds.describe_db_instances()
    logger.debug("RDS response: %s" % response)
    count = 0
    for db_instance in response['DBInstances']:
        db_instance_id = db_instance['DBInstanceIdentifier']
        status = db_instance['DBInstanceStatus']
        if (status == 'available'):
            logger.info("Shutting down RDS instance: %s" % db_instance_id)
            rds.stop_db_instance(DBInstanceIdentifier=db_instance_id)
            count += 1
    if (count == 0):
      logger.info("All RDS instances are already stopped.")

    return 'AWSResourceShutdownManager Run Completed'
