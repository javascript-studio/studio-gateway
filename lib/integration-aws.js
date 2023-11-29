/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const { failure, INVALID } = require('@studio/fail');
const querystring = require('querystring');
const parseJSON = require('json-parse-better-errors');
const { respond } = require('./integration-responder');
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

function identity(value) {
  return value;
}

function parameterType(type_name) {
  if (!type_name) {
    return identity;
  }
  const type = parameter_types[type_name];
  if (!type) {
    throw new Error(`Unknown type "${type_name}"`);
  }
  return type;
}

function parameterMapper(key, type, name, required) {
  return (request, event) => {
    const value = request[key][name];
    if (value === undefined) {
      if (required) {
        throw failure(`Missing required ${key}.${name}`, INVALID);
      }
      return;
    }
    event[key][name] = type(value);
  };
}

function parameterAnyMapper(key) {
  return (request, event) => {
    event[key] = request[key];
  };
}

function parameterBodyMapperList(schema) {
  const props = schema.properties;
  if (!props) {
    return [parameterAnyMapper('payload')];
  }
  const required = schema.required || [];
  const mapper = [];
  for (const key of Object.keys(props)) {
    const prop = props[key];
    const type = parameterType(prop.type);
    mapper.push(parameterMapper('payload', type, key,
      required.indexOf(key) !== -1));
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
  const parameterProc = parameterProcessors(parameters);
  return (params, query, headers, raw_body) => {
    const payload = headers['Content-Type'] === 'application/json'
      ? (raw_body ? parseJSON(raw_body) : {})
      : querystring.parse(raw_body);
    const request = {
      params,
      query,
      headers,
      payload
    };
    const event = createEvent();
    for (const proc of parameterProc) {
      proc(request, event);
    }
    return event;
  };
}

exports.requestProcessor = function (resource, method, integration, stage,
    stageVariables) {
  const parameters = method.parameters;
  const parametersProc = parameters
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
  return (req, params, parsed_url, headers, raw_body, authorizer) => {
    const event = parametersProc(params, parsed_url.query, headers, raw_body);
    log.receive({ method: req.method, url: req.url });
    const context = { stage, authorizer };
    const payload = event.payload;
    const rendered = renderTemplate(request_template, context, event, payload,
      raw_body, stageVariables);
    return parseJSON(rendered);
  };
};

exports.responseProcessor = function (integration, stage, properties) {
  const { responses } = integration;

  return (req, res, err, data) => {
    let response_def = responses.default;
    if (err) {
      const errorMessage = String(err);
      Object.keys(responses).some((re) => {
        if (new RegExp(re).test(errorMessage)) {
          response_def = responses[re];
          return true;
        }
        return false;
      });
      data = { errorMessage };
    }
    const response_templates = response_def.responseTemplates;
    if (response_templates) {
      const response_template = response_templates['application/json'];
      if (response_template) {
        const context = { stage };
        data = renderTemplate(response_template, context, {}, data,
          JSON.stringify(data), properties.stageVariables);
      }
    } else {
      data = JSON.stringify(data);
    }
    respond(req, res, response_def, data, properties);
  };
};
