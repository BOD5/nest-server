import { delay } from './timer';

const BOTS = [
  {
    getMessage: async (mgs: string) => mgs,
    user: {
      id: 1,
      name: 'Echo Bot',
      status: 'Online',
      avatar:
        'https://www.imgworlds.com/wp-content/uploads/2015/12/18-CONTACTUS-HEADER.jpg',
    },
  },
  {
    getMessage: async (msg: string) => {
      await delay(3000);
      return msg.split('').reverse().join('');
    },
    user: {
      id: 2,
      name: 'Reverce Bot',
      status: 'Online',
      avatar:
        'https://www.imgworlds.com/wp-content/uploads/2015/12/18-CONTACTUS-HEADER.jpg',
    },
  },
  {
    getMessage: async () => false,
    user: {
      id: 3,
      name: 'Ignore Bot',
      status: 'Online',
      avatar:
        'https://www.imgworlds.com/wp-content/uploads/2015/12/18-CONTACTUS-HEADER.jpg',
    },
  },
  {
    getMessage: async () => false,
    user: {
      id: 4,
      name: 'Spam Bot',
      status: 'Online',
      avatar:
        'https://www.imgworlds.com/wp-content/uploads/2015/12/18-CONTACTUS-HEADER.jpg',
    },
  },
];

export default BOTS;
