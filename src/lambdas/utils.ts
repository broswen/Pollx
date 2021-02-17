import { BatchWriteItemCommand, BatchWriteItemCommandInput, BatchWriteItemCommandOutput, DynamoDBClient, GetItemCommand, GetItemCommandInput, GetItemCommandOutput, PutItemCommand, PutItemCommandInput, PutItemCommandOutput, QueryCommand, QueryCommandInput, QueryCommandOutput, UpdateItemCommand, UpdateItemCommandInput, UpdateItemCommandOutput } from '@aws-sdk/client-dynamodb';
const ddbClient = new DynamoDBClient({});

const createError = require('http-errors');

export async function getItemById(id: string): Promise<GetItemCommandOutput> {
    const params: GetItemCommandInput = {
        TableName: process.env.POLLS,
        Key: {
            PK: {
                S: `P#${id}`
            },
            SK: {
                S: `P#${id}`
            }
        }
    }

    let data: GetItemCommandOutput;
    try {
        return await ddbClient.send(new GetItemCommand(params));
    } catch (error) {
        console.error(error);
        throw createError(500);
    }
}

export async function getPollResultsById(id: string): Promise<QueryCommandOutput> {
    const params: QueryCommandInput = {
        TableName: process.env.POLLS,
        KeyConditionExpression: '#pk = :pk and begins_with(#sk, :sk)',
        ExpressionAttributeNames: {
            '#pk': 'PK',
            '#sk': "SK"
        },
        ExpressionAttributeValues: {
            ':pk': {
                S: `P#${id}`
            },
            ':sk': {
                S: 'C#'
            }
        }
    }

    let data: QueryCommandOutput;
    try {
        return await ddbClient.send(new QueryCommand(params));
    } catch (error) {
        console.error(error);
        throw createError(500);
    }
}

export async function insertSubmission(id: string, ip: string, choices: string[]): Promise<PutItemCommandOutput> {
    const params: PutItemCommandInput = {
        TableName: process.env.POLLS,
        Item: {
            PK: {
                S: `P#${id}`
            },
            SK: {
                S: `S#${ip}`
            },
            IP: {
                S: ip
            },
            value: {
                SS: choices
            }
        },
        ConditionExpression: "attribute_not_exists(IP)"
    }
    try {
        return await ddbClient.send(new PutItemCommand(params));
        //TODO check failure status for KeyConditionFailure
    } catch (error) {
        console.error(error);
        throw createError(400);
    }
}

export async function updatePollChoices(id: string, choices: string[]): Promise<boolean> {
    const promises: Promise<UpdateItemCommandOutput>[] = choices.map(choice => {

        const params: UpdateItemCommandInput = {
            TableName: process.env.POLLS,
            Key: {
                PK: {
                    S: `P#${id}`
                },
                SK: {
                    S: `C#${choice}`
                }
            },
            UpdateExpression: 'SET #v = #v + :o',
            ExpressionAttributeNames: {
                '#v': 'value'
            },
            ExpressionAttributeValues: {
                ':o': {
                    N: '1'
                }
            }
        }

        return ddbClient.send(new UpdateItemCommand(params));
    });

    await Promise.all(promises);

    return true;
}

export async function insertPoll(id: string, question: string, choices: string[], type: 'SINGLE' | 'MULTIPLE'): Promise<PutItemCommandOutput> {
    const params: PutItemCommandInput = {
        TableName: process.env.POLLS,
        Item: {
            PK: {
                S: `P#${id}`
            },
            SK: {
                S: `P#${id}`
            },
            PK2: {
                S: `testuser`
            },
            question: {
                S: question
            },
            choices: {
                SS: choices
            },
            type: {
                S: type
            },
            enabled: {
                BOOL: true
            }
        }
    }

    try {
        return await ddbClient.send(new PutItemCommand(params));
    } catch (error) {
        console.error(error);
        throw createError(500, error);
    }
}

export async function insertPollChoices(id: string, choices: string[]): Promise<BatchWriteItemCommandOutput> {
    const params: BatchWriteItemCommandInput = {
        RequestItems: {
            [process.env.POLLS]: choices.map(choice => (
                {
                    PutRequest: {
                        Item: {
                            PK: {
                                S: `P#${id}`
                            },
                            SK: {
                                S: `C#${choice}`
                            },
                            value: {
                                N: '0'
                            }
                        }
                    }
                }
            ))
        }
    }

    try {
        return await ddbClient.send(new BatchWriteItemCommand(params));
    } catch (error) {
        console.error(error);
        throw createError(500, error);
    }
}