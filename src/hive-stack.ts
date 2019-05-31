import * as cdk from '@aws-cdk/cdk';
import { Table } from './table';
import { Api } from './api';
import { ApiIntegrations } from './api-integrations';

export class HiveStack extends cdk.Stack {

  static TABLE_NAME = "HiveTable";

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    const integrations = new ApiIntegrations(this, "ApiIntegrations", {
      tableName: HiveStack.TABLE_NAME
    });

    const table = new Table(this, "Table", {
      tableName: HiveStack.TABLE_NAME,
      functions: [
        integrations.onConnectFunction,
        integrations.onDisconnectFunction,
        integrations.onPublishFunction,
        integrations.onSubscribeFunction
      ]
    });

    new Api(this, "API", {
      lambdaIntegrations: {
        OnConnect: integrations.onConnectFunction,
        OnDisconnect: integrations.onDisconnectFunction,
        OnPublish: integrations.onPublishFunction,
        OnSubscribe: integrations.onSubscribeFunction
      }
    });
  }
}
