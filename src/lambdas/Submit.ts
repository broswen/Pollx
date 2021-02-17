'use strict';


import { DynamoDBClient, GetItemCommandOutput, PutItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { getItemById, insertSubmission } from './utils';

const ddbClient = new DynamoDBClient({});

const middy = require('@middy/core');
const createError = require('http-errors');

const jsonBodyParser = require('@middy/http-json-body-parser');
const httpErrorHandler = require('@middy/http-error-handler');
const validator = require('@middy/validator');

const inputSchema: Object = {
  type: 'object',
  properties: {
    pathParameters: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 200 },
      },
      required: ['id']
    },
    body: {
      type: 'object',
      properties: {
        choices: { type: 'array', items: { type: 'string' }, minItems: 1 }
      },
      required: ['choices']
    }
  }
}

const submit = async (event) => {

  const ip: string = event.requestContext.http.sourceIp;

  const data: GetItemCommandOutput = await getItemById(event.pathParameters.id);

  const availableChoices: string[] = data.Item.choices.SS;

  event.body.choices.forEach(choice => {
    if (!availableChoices.includes(choice)) throw createError(400, `invalid choice ${choice}`);
  });

  // return 404 if poll not found by id
  if (data.Item === undefined) {
    throw createError(404);
  }

  // must pass only 1 choice for SINGLE type
  if (data.Item.type.S === 'SINGLE' && event.body.choices.length > 1) {
    throw createError(400, 'submit one choice for type SINGLE');
  }

  // don't allow submission to disabled polls
  if (!data.Item.enabled.BOOL) {
    throw createError(400, 'poll disabled');
  }

  const result: PutItemCommandOutput = await insertSubmission(event.pathParameters.id, ip, event.body.choices);

  return {
    statusCode: 200,
    body: 'OK'
  };
};

const handler = middy(submit)
  .use(jsonBodyParser())
  .use(validator({ inputSchema }))
  .use(httpErrorHandler());

module.exports = { handler }