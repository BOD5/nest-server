import fs from 'fs';

const storage = () => {
  const dataArr = [];
  const creator = () => {
    return;
  };
  creator.getById = (id) => {
    dataArr.find((el) => (el.id = id));
  };
  creator.create = (data, callback) => {
    if (!callback) {
      dataArr.push({
        ...data,
        id: dataArr.length + 1,
      });
    } else dataArr.push(callback(data));
  };
  creator.save = () => {
    return;
  };
  return creator;
};
