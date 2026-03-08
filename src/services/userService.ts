import { mockAllUsers } from '@/data/mockData';
import { mockList, mockCreate, mockUpdate, mockDelete, type ApiResponse } from './api';
import type { User } from '@/types/user';

let users = [...mockAllUsers];

export const userService = {
  list: (): Promise<ApiResponse<User[]>> => mockList(users),
  create: (user: User): Promise<ApiResponse<User>> => mockCreate(users, user),
  update: (id: string, patch: Partial<User>): Promise<ApiResponse<User | null>> => mockUpdate(users, id, patch),
  delete: (id: string): Promise<ApiResponse<boolean>> => mockDelete(users, id),
  _reset: () => { users = [...mockAllUsers]; },
};
