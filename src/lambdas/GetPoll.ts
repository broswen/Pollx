'use strict';

import { GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { getItemById } from './utils';

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
    }
  }
}


const getPoll = async (event) => {

  const data: GetItemCommandOutput = await getItemById(event.pathParameters.id);

  if (data.Item === undefined) {
    throw createError(404);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        id: data.Item.PK.S.split('#')[1],
        question: data.Item.question.S,
        choices: data.Item.choices.SS,
        type: data.Item.type.S,
        enabled: data.Item.enabled.BOOL
      }
    ),
  };
};



const handler = middy(getPoll)
  .use(jsonBodyParser())
  .use(validator({ inputSchema }))
  .use(httpErrorHandler());

module.exports = { handler }