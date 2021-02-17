'use strict';

import { GetItemCommandOutput, QueryCommandOutput } from '@aws-sdk/client-dynamodb';
import { getItemById, getPollResultsById } from './utils';

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


const getPollResults = async (event) => {

  const data: GetItemCommandOutput = await getItemById(event.pathParameters.id);

  if (data.Item === undefined) {
    throw createError(404);
  }

  const results: QueryCommandOutput = await getPollResultsById(event.pathParameters.id);

  const choices: { choice: string, value: number }[] = results.Items.map(item => {
    return {
      choice: item.SK.S.split('#')[1],
      value: parseInt(item.value.N)
    }
  });

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        id: data.Item.PK.S.split('#')[1],
        question: data.Item.question.S,
        choices,
        type: data.Item.type.S,
        enabled: data.Item.enabled.BOOL
      }
    ),
  };
};


const handler = middy(getPollResults)
  .use(jsonBodyParser())
  .use(validator({ inputSchema }))
  .use(httpErrorHandler());

module.exports = { handler }