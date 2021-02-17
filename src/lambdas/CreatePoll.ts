'use strict';


const KSUID = require('ksuid')

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { insertPoll, insertPollChoices } from './utils';

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

  const response = await insertPoll(id.string, event.body.question, event.body.choices, event.body.type);

  const response2 = await insertPollChoices(id.string, event.body.choices)

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        id: id.string,
        question: event.body.question,
        choices: event.body.choices,
        type: event.body.type,
        enabled: true
      }
    ),
  };
};




const handler = middy(createPoll)
  .use(jsonBodyParser())
  .use(validator({ inputSchema }))
  .use(httpErrorHandler());

module.exports = { handler }