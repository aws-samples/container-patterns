import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";

import express from 'express';
const app = express()
const PORT = process.env.PORT || 3000;

// Use the dual stack endpoint for S3 to verify we can make API calls over IPv6
const s3 = new S3Client({
  useDualstackEndpoint: true
});

// Use the dual stack endpoint for EC2 to verify IPv6 egress gateway is working
const ec2 = new EC2Client({
  useDualstackEndpoint: true
});

app.get('/list-buckets', async function (req, res) {
  const command = new ListBucketsCommand({});
  const response = await s3.send(command);
  res.send(response.Buckets)
})

app.get('/list-ec2', async function (req, res) {
  const command = new DescribeInstancesCommand({});
  const response = await ec2.send(command);
  res.send(response.Buckets)
})

app.get('/', async function (req, res) {
  res.send('OK')
})

app.listen(PORT)

console.log(`Listening on http://localhost:${PORT}`);
