var AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const { TABLE_NAME } = process.env;

exports.handler = async (event) => {
    
    let connectionData;

    const { eventType, payload } = JSON.parse(event.body);

    try {
        connectionData = await ddb.query({
            TableName: TABLE_NAME,
            IndexName: "Lookup1",
            KeyConditionExpression: 'key2 = :eventType',
            ExpressionAttributeValues: {
                ':eventType': eventType
            },
            ProjectionExpression: 'key1'
        }).promise();
    } catch (e) {
        return { statusCode: 500, body: e.stack };
    }

    const api = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
    });

    // TODO: Filter for duplicate connectionIds
    const postCalls = connectionData.Items.map(async ({ key1 }) => {
        const connectionId = key1.substring(11);
        try {
            await api.postToConnection({ ConnectionId: connectionId, Data: payload }).promise();
        } catch (exception) {
            // TODO: Handle 500 error, specifically "BadRequestException: Invalid connectionId"?
            if (exception.statusCode === 410) {
                console.log(`Found stale connection, deleting ${connectionId}`);
                // TODO: Delete associated subscriptions as well (see OnDisconnect for same requirement)
                await ddb.delete({
                    TableName: TABLE_NAME,
                    Key: {
                        key1: `connection-${connectionId}`,
                        key2: `connection`
                    }
                }).promise();
            } else {
                throw exception;
            }
        }
    });

    try {
        await Promise.all(postCalls);
    } catch (e) {
        return { statusCode: 500, body: e.stack };
    }

    return { statusCode: 200, body: 'Data sent.' };
};