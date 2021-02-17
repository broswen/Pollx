'use strict';

import { DynamoDBStreamEvent } from "aws-lambda";
import { updatePollChoices } from "./utils";

module.exports.handler = async (event: DynamoDBStreamEvent) => {
  for (let record of event.Records) {
    // ignore non inserts
    if (record.eventName !== 'INSERT') continue;
    // ignore if not submission
    if (!record.dynamodb.Keys.SK.S.startsWith('S#')) continue;
    console.log(JSON.stringify(record));

    const choices: string[] = record.dynamodb.NewImage.value.SS;
    const id: string = record.dynamodb.NewImage.PK.S.split('#')[1];

    const response: boolean = await updatePollChoices(id, choices);
  }

  return 'OK';
};
