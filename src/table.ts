import * as cdk from '@aws-cdk/cdk';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export interface TableProps {
    tableName: string
    functions: lambda.Function[]
}

export class Table extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: TableProps) {

    super(scope, id);

    const table = new dynamodb.Table(this, "HiveTable", {
      tableName: props.tableName,
      partitionKey: {
        name: 'key1',
        type: dynamodb.AttributeType.String
      },
      sortKey: {
        name: 'key2',
        type: dynamodb.AttributeType.String
      },
      ttlAttributeName: 'ttl'
    });

    table.addGlobalSecondaryIndex({
      indexName: 'Lookup1',
      partitionKey: {
        name: 'key2',
        type: dynamodb.AttributeType.String
      },
      sortKey: {
        name: 'key3',
        type: dynamodb.AttributeType.String
      }
    });

    props.functions.forEach(fn => table.grantReadWriteData(fn));
  }
}
