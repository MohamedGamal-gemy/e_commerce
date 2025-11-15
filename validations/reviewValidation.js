const Joi = require("joi");

exports.validateReview = (data) => {
  const schema = Joi.object({
    product: Joi.string().required(),
    rating: Joi.number().min(1).max(5).required().messages({
      "number.min": "Rating must be at least 1",
      "number.max": "Rating must be at most 5",
    }),
    comment: Joi.string().min(3).max(500).required().messages({
      "string.min": "Comment must be at least 3 characters",
    }),
  });

  return schema.validate(data);
};
