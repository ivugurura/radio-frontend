export const baseState = (key = 'data', value = null) => ({
  loading: true,
  done: false,
  [key]: value,
  totalItems: 0,
});

export const dataArr = {
  status: 200,
  message: '',
  totalItems: 0,
  data: [],
};

export const dataObj = {
  status: 200,
  message: '',
  data: {},
};
