import { UserDto } from 'src/chat/dto/user.dto';

const UserClass = () => {
  const userClass = (): void => {
    return;
  };

  const users: UserDto[] = [];

  userClass.createUser = (user: UserDto, status: string) => {
    try {
      const newUser: UserDto = {
        ...user,
        id: users.length + 1,
        status: `${status}`,
      };
      users.push(newUser);
      return newUser;
    } catch (err) {
      throw new Error(err);
    }
  };

  userClass.findByStatus = (status: string) => {
    return users.find((u) => u.status === status);
  };

  userClass.getById = (id: number) => users.find((u) => u.id === id);

  userClass.findUser = (user: UserDto) => {
    try {
      const index = users.findIndex(
        (u) => u.name == user.name && user.id === u.id,
      );
      if (index !== -1) return users[index];
      else return false;
    } catch (err) {
      throw new Error(err);
    }
  };

  userClass.updateUserStatus = (user: UserDto, newStatus: string) => {
    try {
      const index = users.findIndex((u) => user.id === u.id);
      if (index !== -1) {
        users[index].status = newStatus;
        return users[index];
      }
    } catch (e) {
      throw new Error(e);
    }
  };

  userClass.checkUser = (user: UserDto, status: string) => {
    try {
      let us = userClass.findUser(user);
      if (!us) {
        us = userClass.createUser(user, status);
      } else {
        us = userClass.updateUserStatus(user, status);
      }
      return us;
    } catch (e) {
      console.error(e);
      throw new Error(e);
    }
  };

  userClass.toAll = (callback: (...args) => UserDto) => {
    return users.map((u) => {
      return callback(u);
    });
  };

  userClass.getAll = () => {
    return users;
  };

  return userClass;
};

export default UserClass;
