exports.buildPagination = function buildPagination({ skip, limit }) {
  // Ensure skip/limit are integers and limit has a safe upper bound
  const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 200);
  const safeSkip = Math.max(0, Number(skip) || 0);
  return [{ $skip: safeSkip }, { $limit: safeLimit }];
};
