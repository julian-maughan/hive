#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { HiveStack } from './hive-stack';

const app = new cdk.App();

new HiveStack(app, 'HiveStack', {
    stackName: "HiveStack",
    autoDeploy: true
});
