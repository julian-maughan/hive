var AWS = require("aws-sdk");

const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const { TABLE_NAME, DEFAULT_TTL } = process.env;

exports.handler = async (event) => {
    
    const postData = JSON.parse(event.body);

    if (postData.newSubscriptions.length > 25) {
        throw new Error("Number of subscriptions cannot exceed 25");
    }

    const request = {
        RequestItems: {
            [TABLE_NAME]: postData.newSubscriptions.reduce((putRequests, subscription) => {
                putRequests.push({
                    PutRequest: {
                        Item: {
                            key1: `connection-${event.requestContext.connectionId}`,
                            key2: `${subscription}`,
                            key3: `subscription`,
                            ttl: new Date().valueOf() + DEFAULT_TTL
                        }
                    }
                });
                return putRequests;
            }, [])
        }
    };

    try {
        const result = await DDB.batchWrite(request).promise();
        const { data, error } = result.$response;
        console.log(data, error);
    } catch(exception) {
        return {
            statusCode: 500,
            body: `Failed to subscribe: ${JSON.stringify(exception)}`
        };        
    }

    return { statusCode: 200, body: `Subscribed to ${request.RequestItems[TABLE_NAME].length} topic` };
};
