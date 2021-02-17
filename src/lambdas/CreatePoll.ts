'use strict';


const KSUID = require('ksuid')

import { DynamoDBClient, PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';

const ddbClient = new DynamoDBClient({});

const middy = require('@middy/core');
const createError = require('http-errors');

const jsonBodyParser = require('@middy/http-json-body-parser');
const httpErrorHandler = require('@middy/http-error-handler');
const validator = require('@middy/validator');

const inputSchema: Object = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        question: { type: 'string', minLength: 1, maxLength: 200 },
        choices: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 200 } },
        type: { type: 'string', enum: ['SINGLE', 'MULTIPLE'] }
      },
      required: ['question', 'choices', 'type']
    }
  }
}

const createPoll = async (event) => {
  const id = await KSUID.random();

  const response = await insertPoll(id, event.body.question, event.body.choices, event.body.type);

  return {
    statusCode: 200,
    body: JSON.stringify(
      response
    ),
  };
};

const insertPoll = async (id: string, question: string, choices: string[], type: 'SINGLE' | 'MULTIPLE') {
  const params: PutItemCommandInput = {
    TableName: process.env.POLLS,
    Item: {
      PK: {
        S: `P#${id}`
      },
      SK: {
        S: `P#${id}`
      },
      question: {
        S: question
      },
      choices: {
        SS: choices
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


const handler = middy(createPoll)
  .use(jsonBodyParser())
  .use(validator({ inputSchema }))
  .use(httpErrorHandler());

module.exports = { handler }