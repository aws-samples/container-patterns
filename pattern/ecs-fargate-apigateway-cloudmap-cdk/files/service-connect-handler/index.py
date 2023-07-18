import boto3

def on_event(event, context):
  print(event)
  request_type = event['RequestType']
  if request_type == 'Create': return on_create(event)
  if request_type == 'Update': return on_update(event)
  if request_type == 'Delete': return on_delete(event)
  raise Exception("Invalid request type: %s" % request_type)

def on_create(event):
  props = event["ResourceProperties"]
  print("create new resource with props %s" % props)
  cluster = props.get('clusterName')
  service = props.get('serviceName')
  discoveryName = props.get('discoveryName')
  discoveryArns = query_service_arn(cluster, service, discoveryName)

  # add your create code here...
  physical_id = service
  data = {
    'serviceArn':  discoveryArns[0] if len(discoveryArns) > 0 else '',
  }
  print(data)
  return { 'PhysicalResourceId': physical_id, 'Data': data }

def on_update(event):
  physical_id = event["PhysicalResourceId"]
  props = event["ResourceProperties"]
  print("update resource %s with props %s" % (physical_id, props))
  cluster = props.get('clusterName')
  service = props.get('serviceName')
  discoveryName = props.get('discoveryName')
  discoveryArns = query_service_arn(cluster, service, discoveryName)
  data = {
    'serviceArn':  discoveryArns[0] if len(discoveryArns) > 0 else '',
  }
  print(data)
  return { 'PhysicalResourceId': physical_id, 'Data': data }

def on_delete(event):
  physical_id = event["PhysicalResourceId"]
  print("delete resource %s" % physical_id)


# query cloud map serivce arn 
def query_service_arn(cluster, service, discoveryName):
  client = boto3.client('ecs')
  response = client.describe_services(
    cluster=cluster,
    services=[ service ]
  )
  services = response.get('services')[0].get('deployments')[0].get('serviceConnectResources')
  # filter the services by discoveryName
  return [ s.get('discoveryArn') for s in services if s.get('discoveryName') == discoveryName ]