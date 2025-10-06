export const getParams = (additionalParams = [], withPagination = true) => {
  let params = withPagination ? 'page=:page&pageSize=:pageSize' : '';
  additionalParams.forEach((param) => {
    params += `&${param}=:${param}`;
  });
  return params;
};
