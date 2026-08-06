import Joi from 'joi';

export const routeIdSchema = Joi.string()
	.min(1)
	.max(32)
	.pattern(/^[\p{L}\p{N} ._:+/%-]+$/u)
	.custom((value, helpers) => value === value.trim()
		? value
		: helpers.error('string.surroundingWhitespace'))
	.required()
	.messages({
		'string.base': 'routeId must be a string',
		'string.empty': 'routeId cannot be empty',
		'string.pattern.base': 'routeId contains invalid characters',
		'string.surroundingWhitespace': 'routeId cannot start or end with whitespace',
		'any.required': 'routeId is required'
	});
