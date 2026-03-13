import { authClient } from '../../../lib/axios';
import {
  CompanyResponse,
  ProductResponse,
  TierResponse,
  SubscriptionResponse,
  AdminUserResponse,
  RoleResponse,
} from '../../../types';

interface CompanyCreateRequest  { name: string; domain?: string; }
interface CompanyUpdateRequest  { name?: string; domain?: string; is_active?: boolean; }
interface ProductCreateRequest  { name: string; code: string; }
interface ProductUpdateRequest  { name?: string; is_active?: boolean; }
interface SubAssignRequest      { product_id: string; tier_id: string; }
interface SubUpdateRequest      { tier_id?: string; is_active?: boolean; }

export interface UserCreateRequest {
  email:              string;
  full_name?:         string;
  role:               string;
  preferred_contact?: string;
}

export const adminAuthService = {
  // Companies
  listCompanies:    () =>
    authClient.get<CompanyResponse[]>('/admin/companies').then(r => r.data),
  getCompany:       (id: string) =>
    authClient.get<CompanyResponse>(`/admin/companies/${id}`).then(r => r.data),
  createCompany:    (p: CompanyCreateRequest) =>
    authClient.post<CompanyResponse>('/admin/companies', p).then(r => r.data),
  deleteCompany:    (id: string) =>
    authClient.delete(`/admin/companies/${id}`),

  // Products
  listProducts:     () =>
    authClient.get<ProductResponse[]>('/admin/products').then(r => r.data),
  createProduct:    (p: ProductCreateRequest) =>
    authClient.post<ProductResponse>('/admin/products', p).then(r => r.data),
  updateProduct:    (id: string, p: ProductUpdateRequest) =>
    authClient.patch<ProductResponse>(`/admin/products/${id}`, p).then(r => r.data),
  deleteProduct:    (id: string) =>
    authClient.delete(`/admin/products/${id}`),

  // Tiers
  listTiers:        () =>
    authClient.get<TierResponse[]>('/admin/tiers').then(r => r.data),

  // Roles  ← new
  listRoles:        () =>
    authClient.get<RoleResponse[]>('/admin/roles').then(r => r.data),

  // Subscriptions
  listSubscriptions:  (companyId: string) =>
    authClient.get<SubscriptionResponse[]>(`/admin/companies/${companyId}/subscriptions`).then(r => r.data),
  assignSubscription: (companyId: string, p: SubAssignRequest) =>
    authClient.post<SubscriptionResponse>(`/admin/companies/${companyId}/subscriptions`, p).then(r => r.data),
  updateSubscription: (companyId: string, subId: string, p: SubUpdateRequest) =>
    authClient.patch<SubscriptionResponse>(`/admin/companies/${companyId}/subscriptions/${subId}`, p).then(r => r.data),
  deleteSubscription: (companyId: string, subId: string) =>
    authClient.delete(`/admin/companies/${companyId}/subscriptions/${subId}`),

  // Users
  listUsers:     () =>
    authClient.get<AdminUserResponse[]>('/admin/users').then(r => r.data),
  createUser:    (p: UserCreateRequest) =>           // ← new
    authClient.post<AdminUserResponse>('/admin/users', p).then(r => r.data),
  deactivateUser: (userId: string) =>
    authClient.patch(`/admin/users/${userId}/deactivate`).then(r => r.data),
};