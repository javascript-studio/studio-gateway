/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const querystring = require('querystring');
const { renderTemplate } = require('./templates');
const log = require('./log');

const parameter_types = {
  string(value) {
    return value;
  },
  number(value) {
    return Number(value);
  },
  boolean(value) {
    return Boolean(value);
  },
  object(value) {
    return value;
  },
  array(value) {
    return value;
  }
};

function parameterType(type_name) {
  const type = parameter_types[type_name];
  if (!type) {
    throw new Error(`Unknown type "${type_name}"`);
  }
  return type;
}

function parameterMapper(key, type, name, required) {
  const req_name = name.toLowerCase();
  return (request, event) => {
    const value = request[key][req_name];
    if (value === undefined) {
      if (required) {
        throw new Error(`Missing required ${key}.${name}`);
      }
      return;
    }
    event[key][name] = type(value);
  };
}

function parameterBodyMapperList(schema) {
  const props = schema.properties;
  if (!props) {
    return [];
  }
  const mapper = [];
  for (const key of Object.keys(props)) {
    const prop = props[key];
    const type = parameterType(prop.type);
    mapper.push(parameterMapper('payload', type, key, prop.required));
  }
  return mapper;
}

const parameter_in_map = {
  path: 'params',
  header: 'headers',
  query: 'query'
};

function parameterProcessors(parameter_spec) {
  const processors = [];
  for (const param of parameter_spec) {
    const key = parameter_in_map[param.in];
    if (key) {
      const type = parameterType(param.type);
      processors.push(parameterMapper(key, type, param.name, param.required));
    } else if (param.in === 'body') {
      const schema = param.schema;
      if (!schema) {
        throw new Error('Missing schema in body parameter');
      }
      processors.push(...parameterBodyMapperList(schema));
    } else {
      throw new Error(`Unknown parameter.in "${param.in}"`);
    }
  }
  return processors;
}

function createEvent() {
  return {
    params: {},
    headers: {},
    query: {},
    payload: {}
  };
}

function parametersProcessor(parameters) {
  const parameter_proc = parameterProcessors(parameters);
  return (params, query, headers, raw_body) => {
    const payload = headers['content-type'] === 'application/json'
      ? (raw_body ? JSON.parse(raw_body) : {})
      : querystring.parse(raw_body);
    const request = {
      params,
      query,
      headers,
      payload
    };
    const event = createEvent();
    for (const proc of parameter_proc) {
      proc(request, event);
    }
    return event;
  };
}

exports.requestProcessor = function (method, integration) {
  const parameters = method.parameters;
  const parameters_proc = parameters
    ? parametersProcessor(parameters)
    : createEvent;
  const request_templates = integration.requestTemplates;
  if (!request_templates) {
    throw new Error('Missing "requestTemplates"');
  }
  const request_template = request_templates['application/json'];
  if (!request_templates) {
    throw new Error('Missing "application/json" in requestTemplates');
  }
  return (params, query, headers, raw_body, principalId) => {
    const event = parameters_proc(params, query, headers, raw_body);
    log.receive({ event });
    const context = {};
    if (principalId) {
      context.authorizer = { principalId };
    }
    const payload = event.payload;
    return renderTemplate(request_template, context, event, payload, raw_body);
  };
};
